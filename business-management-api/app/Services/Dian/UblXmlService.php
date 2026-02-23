<?php

namespace App\Services\Dian;

use App\Models\ElectronicInvoice;
use App\Models\ElectronicInvoiceItem;
use DOMDocument;
use DOMElement;

/**
 * UblXmlService
 *
 * Genera el XML de factura electrónica en formato UBL 2.1
 * según la especificación DIAN Anexo Técnico v1.9.
 *
 * Namespaces requeridos por la DIAN:
 *   urn:oasis:names:specification:ubl:schema:xsd:Invoice-2
 *   urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2  (cac)
 *   urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2      (cbc)
 *   urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2  (ext)
 *   urn:dian:gov:co:facturaelectronica:Structures-2-1                          (sts)
 *   urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2         (qdt)
 *   urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2 (udt)
 *   urn:oasis:names:specification:ubl:schema:xsd:CommonSignatureComponents-2   (sig)
 *   urn:etsi:org:01903:v1.3.2#                                                  (xades)
 *   urn:oasis:names:tc:XSIG:dsig:schema:v1                                     (ds)
 */
class UblXmlService
{
    // Namespaces
    const NS_INVOICE  = 'urn:oasis:names:specification:ubl:schema:xsd:Invoice-2';
    const NS_CAC      = 'urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2';
    const NS_CBC      = 'urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2';
    const NS_EXT      = 'urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2';
    const NS_STS      = 'urn:dian:gov:co:facturaelectronica:Structures-2-1';
    const NS_DS       = 'http://www.w3.org/2000/09/xmldsig#';
    const NS_XSI      = 'http://www.w3.org/2001/XMLSchema-instance';
    const NS_QDT      = 'urn:oasis:names:specification:ubl:schema:xsd:QualifiedDatatypes-2';
    const NS_UDT      = 'urn:un:unece:uncefact:data:specification:UnqualifiedDataTypesSchemaModule:2';

    private DOMDocument $dom;

    /**
     * Genera el XML UBL 2.1 completo para una factura electrónica.
     * La factura debe tener cargadas: company, resolution, buyer, items.
     */
    public function generate(ElectronicInvoice $invoice): string
    {
        $this->dom = new DOMDocument('1.0', 'UTF-8');
        $this->dom->formatOutput = true;

        $root = $this->buildRoot($invoice);
        $this->dom->appendChild($root);

        return $this->dom->saveXML();
    }

    // ── Root Element ────────────────────────────────────────────────────────────

    private function buildRoot(ElectronicInvoice $invoice): DOMElement
    {
        $root = $this->dom->createElementNS(self::NS_INVOICE, 'Invoice');
        $root->setAttribute('xmlns:cac', self::NS_CAC);
        $root->setAttribute('xmlns:cbc', self::NS_CBC);
        $root->setAttribute('xmlns:ext', self::NS_EXT);
        $root->setAttribute('xmlns:sts', self::NS_STS);
        $root->setAttribute('xmlns:ds',  self::NS_DS);
        $root->setAttribute('xmlns:xsi', self::NS_XSI);
        $root->setAttribute('xmlns:qdt', self::NS_QDT);
        $root->setAttribute('xmlns:udt', self::NS_UDT);

        // Extensión DIAN (espacio reservado para firma digital)
        $root->appendChild($this->buildExtensions($invoice));

        // UBL Version
        $root->appendChild($this->cbc('UBLVersionID', '2.1'));
        $root->appendChild($this->cbc('CustomizationID', '10')); // 10 = Factura de venta

        // Identificación
        $root->appendChild($this->cbc('ProfileID', 'DIAN 2.1'));
        $root->appendChild($this->cbc('ProfileExecutionID', $this->profileId($invoice)));
        $root->appendChild($this->cbc('ID', $invoice->full_number));
        $root->appendChild($this->cbc('UUID', $invoice->cufe ?? '', [
            'schemeID'   => $invoice->resolution->environment === 'produccion' ? '2' : '1',
            'schemeName' => 'CUFE-SHA384',
        ]));

        // Fechas
        $root->appendChild($this->cbc('IssueDate', $invoice->issue_date->format('Y-m-d')));
        $root->appendChild($this->cbc('IssueTime', ($invoice->issue_time ?? now()->format('H:i:s')) . '-05:00'));
        $root->appendChild($this->cbc('InvoiceTypeCode', $invoice->document_type));
        $root->appendChild($this->cbc('Note', $invoice->notes ?? ''));
        $root->appendChild($this->cbc('DocumentCurrencyCode', $invoice->currency ?? 'COP'));
        $root->appendChild($this->cbc('LineCountNumeric', (string) $invoice->items->count()));

        // Período de facturación (si aplica)
        if ($invoice->billing_period_start ?? null) {
            $root->appendChild($this->buildInvoicePeriod($invoice));
        }

        // Referencia a nota crédito/débito
        if ($invoice->reference_invoice_id) {
            $root->appendChild($this->buildBillingReference($invoice));
        }

        // Resolución DIAN
        $root->appendChild($this->buildOrderReference($invoice));

        // Partes
        $root->appendChild($this->buildAccountingSupplierParty($invoice));
        $root->appendChild($this->buildAccountingCustomerParty($invoice));

        // Medios de pago
        $root->appendChild($this->buildPaymentMeans($invoice));

        // Retenciones a nivel de documento (si aplica)
        if ((float) $invoice->tax_retefuente > 0) {
            $root->appendChild($this->buildWithholdingTaxTotal($invoice, '01', $invoice->tax_retefuente));
        }
        if ((float) $invoice->tax_reteiva > 0) {
            $root->appendChild($this->buildWithholdingTaxTotal($invoice, '06', $invoice->tax_reteiva));
        }
        if ((float) $invoice->tax_reteica > 0) {
            $root->appendChild($this->buildWithholdingTaxTotal($invoice, '07', $invoice->tax_reteica));
        }

        // Totales de tributos
        foreach ($this->groupTaxes($invoice) as $taxGroup) {
            $root->appendChild($this->buildTaxTotal($taxGroup));
        }

        // Totales monetarios
        $root->appendChild($this->buildLegalMonetaryTotal($invoice));

        // Líneas de detalle
        foreach ($invoice->items as $item) {
            $root->appendChild($this->buildInvoiceLine($item, $invoice->currency ?? 'COP'));
        }

        return $root;
    }

    // ── Extensiones DIAN (espacio para firma XAdES) ──────────────────────────

    private function buildExtensions(ElectronicInvoice $invoice): DOMElement
    {
        $exts = $this->dom->createElementNS(self::NS_EXT, 'ext:UBLExtensions');

        // Extensión 1: DianExtensions (SoftwareProvider)
        $ext1 = $this->dom->createElementNS(self::NS_EXT, 'ext:UBLExtension');
        $extContent1 = $this->dom->createElementNS(self::NS_EXT, 'ext:ExtensionContent');
        $dianExt = $this->dom->createElementNS(self::NS_STS, 'sts:DianExtensions');

        $softProv = $this->dom->createElementNS(self::NS_STS, 'sts:SoftwareProvider');
        $softProv->appendChild($this->stsEl('sts:ProviderID', $this->cleanNit($invoice->company->nit), [
            'schemeAgencyID' => '195',
            'schemeAgencyName' => 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
            'schemeID' => $this->dvForNit($invoice->company->nit),
            'schemeName' => '31',
        ]));
        $softProv->appendChild($this->stsEl('sts:SoftwareID', $invoice->company->dian_software_id ?? '', [
            'schemeAgencyID' => '195',
            'schemeAgencyName' => 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
        ]));
        $dianExt->appendChild($softProv);

        // SoftwareSecurityCode = SHA384(softwareID + pin + numFac)
        $securityCode = hash('sha384',
            ($invoice->company->dian_software_id ?? '') .
            ($invoice->company->dian_software_pin ?? '') .
            $invoice->full_number
        );
        $softSecCode = $this->dom->createElementNS(self::NS_STS, 'sts:SoftwareSecurityCode');
        $softSecCode->setAttribute('schemeAgencyID', '195');
        $softSecCode->setAttribute('schemeAgencyName', 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)');
        $softSecCode->textContent = $securityCode;
        $dianExt->appendChild($softSecCode);

        // AuthorizationProvider
        $authProv = $this->dom->createElementNS(self::NS_STS, 'sts:AuthorizationProvider');
        $authProv->appendChild($this->stsEl('sts:AuthorizationProviderID', '800197268', [
            'schemeAgencyID'   => '195',
            'schemeAgencyName' => 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
            'schemeID'         => '4',
            'schemeName'       => '31',
        ]));
        $dianExt->appendChild($authProv);

        // QRCode
        $qr = $this->dom->createElementNS(self::NS_STS, 'sts:QRCode');
        $qr->textContent = $invoice->validation_url ?? '';
        $dianExt->appendChild($qr);

        $extContent1->appendChild($dianExt);
        $ext1->appendChild($extContent1);
        $exts->appendChild($ext1);

        // Extensión 2: espacio reservado para firma XAdES (se rellena en XmlSignerService)
        $ext2 = $this->dom->createElementNS(self::NS_EXT, 'ext:UBLExtension');
        $extContent2 = $this->dom->createElementNS(self::NS_EXT, 'ext:ExtensionContent');
        $ext2->appendChild($extContent2);
        $exts->appendChild($ext2);

        return $exts;
    }

    // ── Período de facturación ───────────────────────────────────────────────

    private function buildInvoicePeriod(ElectronicInvoice $invoice): DOMElement
    {
        $period = $this->cac('InvoicePeriod');
        $period->appendChild($this->cbc('StartDate', $invoice->billing_period_start));
        $period->appendChild($this->cbc('EndDate',   $invoice->billing_period_end));
        return $period;
    }

    // ── Referencia a documento anterior ─────────────────────────────────────

    private function buildBillingReference(ElectronicInvoice $invoice): DOMElement
    {
        $ref = $invoice->referenceInvoice;
        $billingRef = $this->cac('BillingReference');
        $invRef = $this->cac('InvoiceDocumentReference');
        $invRef->appendChild($this->cbc('ID', $ref->full_number));
        $invRef->appendChild($this->cbc('UUID', $ref->cufe ?? '', [
            'schemeID'   => '1',
            'schemeName' => 'CUFE-SHA384',
        ]));
        $invRef->appendChild($this->cbc('IssueDate', $ref->issue_date->format('Y-m-d')));
        if ($invoice->correction_concept) {
            $disc = $this->cac('DocumentDescription');
            $disc->textContent = ElectronicInvoice::CORRECTION_CONCEPTS[$invoice->correction_concept] ?? $invoice->correction_concept;
            $invRef->appendChild($disc);
        }
        $billingRef->appendChild($invRef);
        return $billingRef;
    }

    // ── Resolución DIAN ──────────────────────────────────────────────────────

    private function buildOrderReference(ElectronicInvoice $invoice): DOMElement
    {
        $res = $invoice->resolution;
        $orderRef = $this->cac('OrderReference');
        $orderRef->appendChild($this->cbc('ID', $invoice->full_number));
        $orderRef->appendChild($this->cbc('IssueDate', $res->resolution_date->format('Y-m-d')));

        // Habilitación de numeración
        $numAuth = $this->cac('AdditionalDocumentReference');
        $numAuth->appendChild($this->cbc('ID', $res->resolution_number));
        $numAuth->appendChild($this->cbc('IssueDate', $res->resolution_date->format('Y-m-d')));
        $numAuth->appendChild($this->cbc('DocumentTypeCode', 'ResolucionFacturacion'));
        $validity = $this->cac('Validity');
        $validity->appendChild($this->cbc('ValidityPeriod', $res->valid_to->format('Y-m-d')));
        $numAuth->appendChild($validity);
        $numAuth->appendChild($this->cbc('DocumentDescription',
            "Prefijo: {$res->prefix}; Rango: {$res->from_number}-{$res->to_number}"
        ));

        $orderRef->appendChild($numAuth);
        return $orderRef;
    }

    // ── Proveedor (Emisor / OFE) ─────────────────────────────────────────────

    private function buildAccountingSupplierParty(ElectronicInvoice $invoice): DOMElement
    {
        $company = $invoice->company;
        $nit     = $this->cleanNit($company->nit);

        $supplierParty = $this->cac('AccountingSupplierParty');
        $supplierParty->appendChild($this->cbc('AdditionalAccountID',
            $company->person_type === 'natural' ? '1' : '2'
        ));

        $party = $this->cac('Party');

        // Nombre registrado
        $partyName = $this->cac('PartyName');
        $partyName->appendChild($this->cbc('Name', $company->legal_name ?? $company->name));
        $party->appendChild($partyName);

        // Dirección
        $party->appendChild($this->buildAddress($company->address ?? [], 'supplier'));

        // Información fiscal (NIT)
        $partyTax = $this->cac('PartyTaxScheme');
        $partyTax->appendChild($this->cbc('RegistrationName', $company->legal_name ?? $company->name));
        $partyTax->appendChild($this->cbc('CompanyID', $nit, [
            'schemeAgencyID'   => '195',
            'schemeAgencyName' => 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
            'schemeID'         => $company->nit_dv ?? $this->dvForNit($nit),
            'schemeName'       => '31', // NIT
        ]));
        $taxScheme = $this->cac('TaxScheme');
        $taxScheme->appendChild($this->cbc('ID', '01'));
        $taxScheme->appendChild($this->cbc('Name', 'IVA'));
        $partyTax->appendChild($taxScheme);
        $party->appendChild($partyTax);

        // Información legal
        $partyLegal = $this->cac('PartyLegalEntity');
        $partyLegal->appendChild($this->cbc('RegistrationName', $company->legal_name ?? $company->name));
        $partyLegal->appendChild($this->cbc('CompanyID', $nit, [
            'schemeAgencyID'   => '195',
            'schemeAgencyName' => 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
            'schemeID'         => $company->nit_dv ?? $this->dvForNit($nit),
            'schemeName'       => '31',
        ]));
        $party->appendChild($partyLegal);

        // Contacto
        if ($company->email ?? null) {
            $contact = $this->cac('Contact');
            $contact->appendChild($this->cbc('ElectronicMail', $company->email));
            if ($company->phone ?? null) {
                $contact->appendChild($this->cbc('Telephone', $company->phone));
            }
            $party->appendChild($contact);
        }

        $supplierParty->appendChild($party);
        return $supplierParty;
    }

    // ── Cliente (Adquirente) ─────────────────────────────────────────────────

    private function buildAccountingCustomerParty(ElectronicInvoice $invoice): DOMElement
    {
        $customerParty = $this->cac('AccountingCustomerParty');
        $customerParty->appendChild($this->cbc('AdditionalAccountID',
            $invoice->buyer_person_type === 'natural' ? '1' : '2'
        ));

        $party = $this->cac('Party');

        $partyName = $this->cac('PartyName');
        $partyName->appendChild($this->cbc('Name', $invoice->buyer_name ?? 'Consumidor final'));
        $party->appendChild($partyName);

        // Dirección comprador
        $party->appendChild($this->buildBuyerAddress($invoice));

        // Tipo de documento y número
        $docTypeCode = $this->mapDocType($invoice->buyer_document_type ?? 'CC');
        $partyTax = $this->cac('PartyTaxScheme');
        $partyTax->appendChild($this->cbc('RegistrationName', $invoice->buyer_name ?? 'Consumidor final'));

        $buyerDoc = preg_replace('/[^0-9A-Za-z]/', '', $invoice->buyer_document ?? '222222222222');
        $partyTax->appendChild($this->cbc('CompanyID', $buyerDoc, [
            'schemeAgencyID'   => '195',
            'schemeAgencyName' => 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
            'schemeID'         => $invoice->buyer_nit_dv ?? '0',
            'schemeName'       => (string) $docTypeCode,
        ]));

        $taxScheme = $this->cac('TaxScheme');
        $taxScheme->appendChild($this->cbc('ID', 'ZZ'));
        $taxScheme->appendChild($this->cbc('Name', 'No aplica'));
        $partyTax->appendChild($taxScheme);
        $party->appendChild($partyTax);

        $partyLegal = $this->cac('PartyLegalEntity');
        $partyLegal->appendChild($this->cbc('RegistrationName', $invoice->buyer_name ?? 'Consumidor final'));
        $partyLegal->appendChild($this->cbc('CompanyID', $buyerDoc, [
            'schemeAgencyID'   => '195',
            'schemeAgencyName' => 'CO, DIAN (Dirección de Impuestos y Aduanas Nacionales)',
            'schemeID'         => $invoice->buyer_nit_dv ?? '0',
            'schemeName'       => (string) $docTypeCode,
        ]));
        $party->appendChild($partyLegal);

        if ($invoice->buyer_email ?? null) {
            $contact = $this->cac('Contact');
            $contact->appendChild($this->cbc('ElectronicMail', $invoice->buyer_email));
            $party->appendChild($contact);
        }

        $customerParty->appendChild($party);
        return $customerParty;
    }

    // ── Dirección ────────────────────────────────────────────────────────────

    private function buildAddress(array|object $addr, string $type): DOMElement
    {
        $address = $this->cac('PhysicalLocation');
        $addrEl  = $this->cac('Address');

        $addr = is_array($addr) ? (object) $addr : $addr;

        $addrEl->appendChild($this->cbc('ID', $addr->city_code ?? '11001')); // Bogotá default
        $addrEl->appendChild($this->cbc('CityName', $addr->city ?? 'Bogotá'));
        $addrEl->appendChild($this->cbc('PostalZone', $addr->postal_code ?? '110111'));

        $countrySubentity = $this->cac('CountrySubentity');
        $countrySubentity->appendChild($this->cbc('IdentificationCode', $addr->department_code ?? '11'));
        $addrEl->appendChild($countrySubentity);

        $addrLine = $this->cac('AddressLine');
        $addrLine->appendChild($this->cbc('Line', $addr->address_line ?? 'Sin dirección'));
        $addrEl->appendChild($addrLine);

        $country = $this->cac('Country');
        $country->appendChild($this->cbc('IdentificationCode', 'CO'));
        $country->appendChild($this->cbc('Name', 'Colombia', ['languageID' => 'es']));
        $addrEl->appendChild($country);

        $address->appendChild($addrEl);
        return $address;
    }

    private function buildBuyerAddress(ElectronicInvoice $invoice): DOMElement
    {
        $address = $this->cac('PhysicalLocation');
        $addrEl  = $this->cac('Address');

        $addrEl->appendChild($this->cbc('ID', $invoice->buyer_city_code ?? '11001'));
        $addrEl->appendChild($this->cbc('CityName', $invoice->buyer_city ?? 'Bogotá'));
        $addrEl->appendChild($this->cbc('PostalZone', $invoice->buyer_postal_code ?? '110111'));

        $countrySubentity = $this->cac('CountrySubentity');
        $countrySubentity->appendChild($this->cbc('IdentificationCode',
            $invoice->buyer_department_code ?? '11'));
        $addrEl->appendChild($countrySubentity);

        $addrLine = $this->cac('AddressLine');
        $addrLine->appendChild($this->cbc('Line', $invoice->buyer_address ?? 'Sin dirección'));
        $addrEl->appendChild($addrLine);

        $country = $this->cac('Country');
        $country->appendChild($this->cbc('IdentificationCode', 'CO'));
        $country->appendChild($this->cbc('Name', 'Colombia', ['languageID' => 'es']));
        $addrEl->appendChild($country);

        $address->appendChild($addrEl);
        return $address;
    }

    // ── Medios de pago ───────────────────────────────────────────────────────

    private function buildPaymentMeans(ElectronicInvoice $invoice): DOMElement
    {
        $pm = $this->cac('PaymentMeans');
        // 1=Contado, 2=Crédito
        $pm->appendChild($this->cbc('ID', '1'));
        $pm->appendChild($this->cbc('PaymentMeansCode', '10')); // 10=Efectivo (UNECE)
        $pm->appendChild($this->cbc('PaymentDueDate',
            $invoice->due_date ? $invoice->due_date->format('Y-m-d') : $invoice->issue_date->format('Y-m-d')
        ));
        return $pm;
    }

    // ── Retenciones a nivel de documento ────────────────────────────────────

    private function buildWithholdingTaxTotal(
        ElectronicInvoice $invoice,
        string $taxId,
        float|string $amount
    ): DOMElement {
        $taxNames = ['01' => 'Retención en la Fuente', '06' => 'Retención IVA', '07' => 'Retención ICA'];
        $taxTotal = $this->cac('WithholdingTaxTotal');
        $taxTotal->appendChild($this->cbc('TaxAmount', $this->fmt($amount), [
            'currencyID' => $invoice->currency ?? 'COP',
        ]));

        $taxSubtotal = $this->cac('TaxSubtotal');
        $taxSubtotal->appendChild($this->cbc('TaxableAmount', $this->fmt($invoice->subtotal), [
            'currencyID' => $invoice->currency ?? 'COP',
        ]));
        $taxSubtotal->appendChild($this->cbc('TaxAmount', $this->fmt($amount), [
            'currencyID' => $invoice->currency ?? 'COP',
        ]));

        $taxCategory = $this->cac('TaxCategory');
        $taxScheme   = $this->cac('TaxScheme');
        $taxScheme->appendChild($this->cbc('ID', $taxId));
        $taxScheme->appendChild($this->cbc('Name', $taxNames[$taxId] ?? ''));
        $taxCategory->appendChild($taxScheme);
        $taxSubtotal->appendChild($taxCategory);
        $taxTotal->appendChild($taxSubtotal);

        return $taxTotal;
    }

    // ── Totales de tributos ──────────────────────────────────────────────────

    /**
     * Agrupa los tributos de las líneas por código de impuesto.
     * Devuelve array de [ taxCode, taxName, taxableAmount, taxAmount ]
     */
    private function groupTaxes(ElectronicInvoice $invoice): array
    {
        $groups = [];
        $currency = $invoice->currency ?? 'COP';

        foreach ($invoice->items as $item) {
            $code = $item->tax_code;
            if ($code === 'ZY' || $code === 'ZZ') continue;
            if (!isset($groups[$code])) {
                $groups[$code] = [
                    'taxCode'       => $code,
                    'taxName'       => $item->tax_name,
                    'taxableAmount' => 0,
                    'taxAmount'     => 0,
                    'taxRate'       => (float) $item->tax_rate * 100,
                    'currency'      => $currency,
                ];
            }
            $groups[$code]['taxableAmount'] += (float) $item->tax_base;
            $groups[$code]['taxAmount']     += (float) $item->tax_value;
        }

        return array_values($groups);
    }

    private function buildTaxTotal(array $group): DOMElement
    {
        $taxTotal = $this->cac('TaxTotal');
        $taxTotal->appendChild($this->cbc('TaxAmount', $this->fmt($group['taxAmount']), [
            'currencyID' => $group['currency'],
        ]));

        $taxSubtotal = $this->cac('TaxSubtotal');
        $taxSubtotal->appendChild($this->cbc('TaxableAmount', $this->fmt($group['taxableAmount']), [
            'currencyID' => $group['currency'],
        ]));
        $taxSubtotal->appendChild($this->cbc('TaxAmount', $this->fmt($group['taxAmount']), [
            'currencyID' => $group['currency'],
        ]));
        $taxSubtotal->appendChild($this->cbc('Percent', $this->fmt($group['taxRate'])));

        $taxCategory = $this->cac('TaxCategory');
        $taxCategory->appendChild($this->cbc('Percent', $this->fmt($group['taxRate'])));
        $taxScheme = $this->cac('TaxScheme');
        $taxScheme->appendChild($this->cbc('ID', $group['taxCode']));
        $taxScheme->appendChild($this->cbc('Name', $group['taxName']));
        $taxCategory->appendChild($taxScheme);
        $taxSubtotal->appendChild($taxCategory);

        $taxTotal->appendChild($taxSubtotal);
        return $taxTotal;
    }

    // ── Totales monetarios legales ───────────────────────────────────────────

    private function buildLegalMonetaryTotal(ElectronicInvoice $invoice): DOMElement
    {
        $currency = $invoice->currency ?? 'COP';
        $lmt = $this->cac('LegalMonetaryTotal');

        // LineExtensionAmount = suma de subtotales de línea (antes de impuestos)
        $lineExtension = $invoice->items->sum(fn($i) => (float) $i->subtotal);
        $lmt->appendChild($this->cbc('LineExtensionAmount', $this->fmt($lineExtension),
            ['currencyID' => $currency]
        ));

        // TaxExclusiveAmount = base imponible total
        $lmt->appendChild($this->cbc('TaxExclusiveAmount', $this->fmt($lineExtension),
            ['currencyID' => $currency]
        ));

        // TaxInclusiveAmount = total con impuestos
        $lmt->appendChild($this->cbc('TaxInclusiveAmount', $this->fmt($invoice->total),
            ['currencyID' => $currency]
        ));

        // AllowanceTotalAmount = total descuentos
        if ((float) $invoice->discount_total > 0) {
            $lmt->appendChild($this->cbc('AllowanceTotalAmount', $this->fmt($invoice->discount_total),
                ['currencyID' => $currency]
            ));
        }

        // PrepaidAmount (anticipos — 0 por defecto)
        $lmt->appendChild($this->cbc('PrepaidAmount', '0.00', ['currencyID' => $currency]));

        // PayableAmount = monto a pagar neto
        $lmt->appendChild($this->cbc('PayableAmount', $this->fmt($invoice->net_payable),
            ['currencyID' => $currency]
        ));

        return $lmt;
    }

    // ── Líneas de factura ────────────────────────────────────────────────────

    private function buildInvoiceLine(ElectronicInvoiceItem $item, string $currency): DOMElement
    {
        $line = $this->cac('InvoiceLine');
        $line->appendChild($this->cbc('ID', (string) $item->line_number));
        $line->appendChild($this->cbc('InvoicedQuantity', $this->fmtQty($item->quantity), [
            'unitCode' => $item->unit_code ?? '94',
        ]));
        $line->appendChild($this->cbc('LineExtensionAmount', $this->fmt($item->subtotal),
            ['currencyID' => $currency]
        ));

        // Nota de línea
        $line->appendChild($this->cbc('FreeOfChargeIndicator', 'false'));

        // Descuento a nivel de línea
        if ((float) $item->discount_value > 0) {
            $allowance = $this->cac('AllowanceCharge');
            $allowance->appendChild($this->cbc('ChargeIndicator', 'false'));
            $allowance->appendChild($this->cbc('AllowanceChargeReasonCode', '00'));
            $allowance->appendChild($this->cbc('AllowanceChargeReason', 'Descuento'));
            $allowance->appendChild($this->cbc('MultiplierFactorNumeric',
                $this->fmt((float) $item->discount_rate * 100)
            ));
            $allowance->appendChild($this->cbc('Amount', $this->fmt($item->discount_value),
                ['currencyID' => $currency]
            ));
            $allowance->appendChild($this->cbc('BaseAmount',
                $this->fmt((float) $item->quantity * (float) $item->unit_price),
                ['currencyID' => $currency]
            ));
            $line->appendChild($allowance);
        }

        // Impuesto de la línea
        if ($item->tax_code !== 'ZY' && $item->tax_code !== 'ZZ') {
            $taxTotal = $this->cac('TaxTotal');
            $taxTotal->appendChild($this->cbc('TaxAmount', $this->fmt($item->tax_value),
                ['currencyID' => $currency]
            ));
            $taxSubtotal = $this->cac('TaxSubtotal');
            $taxSubtotal->appendChild($this->cbc('TaxableAmount', $this->fmt($item->tax_base),
                ['currencyID' => $currency]
            ));
            $taxSubtotal->appendChild($this->cbc('TaxAmount', $this->fmt($item->tax_value),
                ['currencyID' => $currency]
            ));
            $taxSubtotal->appendChild($this->cbc('Percent',
                $this->fmt((float) $item->tax_rate * 100)
            ));
            $taxCategory = $this->cac('TaxCategory');
            $taxCategory->appendChild($this->cbc('Percent',
                $this->fmt((float) $item->tax_rate * 100)
            ));
            $taxScheme = $this->cac('TaxScheme');
            $taxScheme->appendChild($this->cbc('ID', $item->tax_code));
            $taxScheme->appendChild($this->cbc('Name', $item->tax_name));
            $taxCategory->appendChild($taxScheme);
            $taxSubtotal->appendChild($taxCategory);
            $taxTotal->appendChild($taxSubtotal);
            $line->appendChild($taxTotal);
        }

        // Descripción del ítem
        $lineItem = $this->cac('Item');
        $lineItem->appendChild($this->cbc('Description', $item->description));

        if ($item->standard_code) {
            $sellers = $this->cac('SellersItemIdentification');
            $sellers->appendChild($this->cbc('ID', $item->standard_code));
            $lineItem->appendChild($sellers);

            $standard = $this->cac('StandardItemIdentification');
            $standard->appendChild($this->cbc('ID', $item->standard_code, ['schemeID' => '001']));
            $lineItem->appendChild($standard);
        }
        $line->appendChild($lineItem);

        // Precio unitario
        $price = $this->cac('Price');
        $price->appendChild($this->cbc('PriceAmount', $this->fmt($item->unit_price),
            ['currencyID' => $currency]
        ));
        $price->appendChild($this->cbc('BaseQuantity', $this->fmtQty($item->quantity), [
            'unitCode' => $item->unit_code ?? '94',
        ]));
        $line->appendChild($price);

        return $line;
    }

    // ── Helpers de DOM ───────────────────────────────────────────────────────

    /** Crea un elemento cbc: (CommonBasicComponents) */
    private function cbc(string $localName, string $value, array $attrs = []): DOMElement
    {
        $el = $this->dom->createElementNS(self::NS_CBC, "cbc:{$localName}");
        $el->textContent = $value;
        foreach ($attrs as $k => $v) {
            $el->setAttribute($k, (string) $v);
        }
        return $el;
    }

    /** Crea un elemento cac: (CommonAggregateComponents) */
    private function cac(string $localName): DOMElement
    {
        return $this->dom->createElementNS(self::NS_CAC, "cac:{$localName}");
    }

    /** Crea un elemento sts: (DIAN Structures) */
    private function stsEl(string $localName, string $value, array $attrs = []): DOMElement
    {
        $el = $this->dom->createElementNS(self::NS_STS, $localName);
        $el->textContent = $value;
        foreach ($attrs as $k => $v) {
            $el->setAttribute($k, (string) $v);
        }
        return $el;
    }

    // ── Helpers de formato ───────────────────────────────────────────────────

    /** Formatea un monto con 2 decimales */
    private function fmt(float|string $amount): string
    {
        return number_format(round((float) $amount, 2), 2, '.', '');
    }

    /** Formatea una cantidad con 4 decimales */
    private function fmtQty(float|string $qty): string
    {
        return number_format(round((float) $qty, 4), 4, '.', '');
    }

    /** Limpia NIT dejando solo dígitos */
    private function cleanNit(string $nit): string
    {
        return preg_replace('/[^0-9]/', '', $nit);
    }

    /**
     * Calcula el DV de un NIT colombiano.
     * Algoritmo estándar DIAN.
     */
    private function dvForNit(string $nit): string
    {
        $nit    = $this->cleanNit($nit);
        $primes = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43, 47, 53, 59, 67, 71];
        $sum    = 0;
        $len    = strlen($nit);
        for ($i = 0; $i < $len; $i++) {
            $sum += (int) $nit[$len - 1 - $i] * $primes[$i];
        }
        $rem = $sum % 11;
        return (string) ($rem < 2 ? $rem : 11 - $rem);
    }

    /**
     * Mapea tipo de documento colombiano al código DIAN.
     * 11=CC, 12=Tarjeta identidad, 13=Cédula extranjería,
     * 21=Tarjeta extranjería, 22=Cédula diplomática, 31=NIT,
     * 41=Pasaporte, 42=Tipo doc extranjero, 50=NIT otro país
     */
    private function mapDocType(string $type): int
    {
        return match(strtoupper($type)) {
            'CC'  => 13,
            'TI'  => 12,
            'CE'  => 22,
            'NIT' => 31,
            'PP'  => 41,
            'TE'  => 21,
            default => 13,
        };
    }

    /** Determina el ProfileExecutionID según ambiente */
    private function profileId(ElectronicInvoice $invoice): string
    {
        return ($invoice->resolution->environment ?? 'habilitacion') === 'produccion' ? '2' : '1';
    }
}
