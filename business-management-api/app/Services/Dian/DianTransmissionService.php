<?php

namespace App\Services\Dian;

use App\Models\ElectronicInvoice;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * DianTransmissionService
 *
 * Envía documentos electrónicos a la DIAN mediante el servicio web SOAP
 * usando el proveedor tecnológico configurado en la empresa.
 *
 * La DIAN expone dos ambientes:
 *   Habilitación: https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc
 *   Producción:   https://vpfe.dian.gov.co/WcfDianCustomerServices.svc
 *
 * Flujo de envío:
 *   1. Firmar XML (XmlSignerService — no implementado aún)
 *   2. Codificar en Base64
 *   3. Comprimir en ZIP con nombre = CUFE.xml
 *   4. POST SendBillSync (o SendBillAsync para lote)
 *   5. Consultar estado con GetStatusZip
 *
 * Nota: Para operar se requiere certificado digital X.509 emitido por
 * entidad certificadora habilitada por la ONAC.
 */
class DianTransmissionService
{
    // WSDL endpoints
    const ENDPOINT_HAB  = 'https://vpfe-hab.dian.gov.co/WcfDianCustomerServices.svc';
    const ENDPOINT_PROD = 'https://vpfe.dian.gov.co/WcfDianCustomerServices.svc';

    // Resultados posibles de la DIAN
    const STATUS_ACCEPTED    = 'accepted';
    const STATUS_REJECTED    = 'rejected';
    const STATUS_PROCESSING  = 'processing';
    const STATUS_ERROR       = 'error';

    /**
     * Envía una factura a la DIAN y actualiza el estado en la BD.
     *
     * Devuelve un array con:
     *   status:  accepted|rejected|processing|error
     *   track_id: string (DIAN trackId)
     *   is_valid: bool
     *   status_code: string
     *   status_message: string
     *   errors: array
     */
    public function send(ElectronicInvoice $invoice): array
    {
        if (!$invoice->xml_content) {
            throw new \RuntimeException('La factura no tiene XML generado. Ejecute primero UblXmlService.');
        }

        $company  = $invoice->company;
        $endpoint = $this->endpoint($invoice);

        try {
            // 1. Preparar payload ZIP en Base64
            $zipContent = $this->buildZip($invoice);
            $zipBase64  = base64_encode($zipContent);
            $fileName   = $invoice->cufe . '.zip';

            // 2. Construir sobre SOAP
            $soapBody = $this->buildSendBillSyncSoap($zipBase64, $fileName);

            // 3. Enviar
            $response = Http::withHeaders([
                'Content-Type' => 'text/xml; charset=utf-8',
                'SOAPAction'   => '"http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillSync"',
            ])
            ->timeout(60)
            ->withBody($soapBody, 'text/xml')
            ->post($endpoint);

            if (!$response->successful()) {
                return $this->errorResult(
                    "HTTP {$response->status()}: {$response->body()}",
                    $invoice
                );
            }

            // 4. Parsear respuesta SOAP
            return $this->parseSendResponse($response->body(), $invoice);

        } catch (\Exception $e) {
            Log::error('DIAN transmission error', [
                'invoice_id' => $invoice->id,
                'error'      => $e->getMessage(),
            ]);
            return $this->errorResult($e->getMessage(), $invoice);
        }
    }

    /**
     * Consulta el estado de procesamiento de un documento previamente enviado.
     * Usa GetStatusZip con el trackId retornado por la DIAN.
     */
    public function checkStatus(ElectronicInvoice $invoice): array
    {
        if (!$invoice->dian_track_id) {
            return $this->errorResult('No hay trackId registrado para consultar.', $invoice);
        }

        $endpoint = $this->endpoint($invoice);

        try {
            $soapBody = $this->buildGetStatusZipSoap($invoice->dian_track_id);

            $response = Http::withHeaders([
                'Content-Type' => 'text/xml; charset=utf-8',
                'SOAPAction'   => '"http://wcf.dian.colombia/IWcfDianCustomerServices/GetStatusZip"',
            ])
            ->timeout(30)
            ->withBody($soapBody, 'text/xml')
            ->post($endpoint);

            if (!$response->successful()) {
                return $this->errorResult("HTTP {$response->status()}", $invoice);
            }

            return $this->parseStatusResponse($response->body(), $invoice);

        } catch (\Exception $e) {
            return $this->errorResult($e->getMessage(), $invoice);
        }
    }

    /**
     * Envío en lote (hasta 50 documentos).
     * Retorna el trackId del lote.
     */
    public function sendBatch(array $invoices): array
    {
        if (empty($invoices)) {
            return ['status' => self::STATUS_ERROR, 'message' => 'Lote vacío'];
        }

        /** @var ElectronicInvoice $first */
        $first    = $invoices[0];
        $endpoint = $this->endpoint($first);

        try {
            $zipContent = $this->buildBatchZip($invoices);
            $zipBase64  = base64_encode($zipContent);
            $fileName   = 'lote_' . now()->format('YmdHis') . '.zip';

            $soapBody = $this->buildSendBillAsyncSoap($zipBase64, $fileName);

            $response = Http::withHeaders([
                'Content-Type' => 'text/xml; charset=utf-8',
                'SOAPAction'   => '"http://wcf.dian.colombia/IWcfDianCustomerServices/SendBillAsync"',
            ])
            ->timeout(120)
            ->withBody($soapBody, 'text/xml')
            ->post($endpoint);

            if (!$response->successful()) {
                return ['status' => self::STATUS_ERROR, 'message' => "HTTP {$response->status()}"];
            }

            $trackId = $this->extractTrackId($response->body());
            return ['status' => self::STATUS_PROCESSING, 'track_id' => $trackId];

        } catch (\Exception $e) {
            return ['status' => self::STATUS_ERROR, 'message' => $e->getMessage()];
        }
    }

    // ── SOAP builders ────────────────────────────────────────────────────────

    private function buildSendBillSyncSoap(string $zipBase64, string $fileName): string
    {
        return <<<XML
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:SendBillSync>
      <wcf:fileName>{$fileName}</wcf:fileName>
      <wcf:contentFile>{$zipBase64}</wcf:contentFile>
    </wcf:SendBillSync>
  </soap:Body>
</soap:Envelope>
XML;
    }

    private function buildSendBillAsyncSoap(string $zipBase64, string $fileName): string
    {
        return <<<XML
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:SendBillAsync>
      <wcf:fileName>{$fileName}</wcf:fileName>
      <wcf:contentFile>{$zipBase64}</wcf:contentFile>
    </wcf:SendBillAsync>
  </soap:Body>
</soap:Envelope>
XML;
    }

    private function buildGetStatusZipSoap(string $trackId): string
    {
        return <<<XML
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope
    xmlns:soap="http://www.w3.org/2003/05/soap-envelope"
    xmlns:wcf="http://wcf.dian.colombia">
  <soap:Header/>
  <soap:Body>
    <wcf:GetStatusZip>
      <wcf:trackId>{$trackId}</wcf:trackId>
    </wcf:GetStatusZip>
  </soap:Body>
</soap:Envelope>
XML;
    }

    // ── ZIP helpers ──────────────────────────────────────────────────────────

    /**
     * Empaqueta el XML firmado en un ZIP con nombre = CUFE.xml
     * Requiere la extensión zip de PHP.
     */
    private function buildZip(ElectronicInvoice $invoice): string
    {
        $tmpFile = tempnam(sys_get_temp_dir(), 'dian_');
        $zip     = new \ZipArchive();
        $zip->open($tmpFile, \ZipArchive::OVERWRITE);
        $zip->addFromString($invoice->cufe . '.xml', $invoice->xml_content);
        $zip->close();

        $content = file_get_contents($tmpFile);
        unlink($tmpFile);
        return $content;
    }

    private function buildBatchZip(array $invoices): string
    {
        $tmpFile = tempnam(sys_get_temp_dir(), 'dian_batch_');
        $zip     = new \ZipArchive();
        $zip->open($tmpFile, \ZipArchive::OVERWRITE);
        foreach ($invoices as $invoice) {
            $zip->addFromString($invoice->cufe . '.xml', $invoice->xml_content);
        }
        $zip->close();
        $content = file_get_contents($tmpFile);
        unlink($tmpFile);
        return $content;
    }

    // ── Parsers de respuesta SOAP ────────────────────────────────────────────

    private function parseSendResponse(string $soapXml, ElectronicInvoice $invoice): array
    {
        try {
            $xml = new \SimpleXMLElement($soapXml);
            $xml->registerXPathNamespace('s', 'http://www.w3.org/2003/05/soap-envelope');
            $xml->registerXPathNamespace('wcf', 'http://wcf.dian.colombia');

            // Extraer el ApplicationResponse (viene Base64 dentro del SOAP)
            $responseNodes = $xml->xpath('//wcf:SendBillSyncResult/wcf:XmlBase64Bytes');
            $applicationResponse = $responseNodes
                ? base64_decode((string) $responseNodes[0])
                : null;

            $trackIdNodes = $xml->xpath('//wcf:SendBillSyncResult/wcf:ZipKey');
            $trackId = $trackIdNodes ? (string) $trackIdNodes[0] : null;

            $isValidNodes = $xml->xpath('//wcf:SendBillSyncResult/wcf:IsValid');
            $isValid = $isValidNodes ? ((string) $isValidNodes[0] === 'true') : false;

            $statusCodeNodes = $xml->xpath('//wcf:SendBillSyncResult/wcf:StatusCode');
            $statusCode = $statusCodeNodes ? (string) $statusCodeNodes[0] : '0';

            $statusDescNodes = $xml->xpath('//wcf:SendBillSyncResult/wcf:StatusDescription');
            $statusDesc = $statusDescNodes ? (string) $statusDescNodes[0] : '';

            $errorsNodes = $xml->xpath('//wcf:SendBillSyncResult/wcf:ErrorMessage/wcf:string');
            $errors = array_map(fn($n) => (string) $n, $errorsNodes ?: []);

            $status = $isValid ? self::STATUS_ACCEPTED
                : (in_array($statusCode, ['00', '66']) ? self::STATUS_PROCESSING : self::STATUS_REJECTED);

            $result = [
                'status'         => $status,
                'track_id'       => $trackId,
                'is_valid'       => $isValid,
                'status_code'    => $statusCode,
                'status_message' => $statusDesc,
                'errors'         => $errors,
            ];

            // Actualizar modelo
            $this->updateInvoiceStatus($invoice, $result);

            return $result;

        } catch (\Exception $e) {
            return $this->errorResult('Error parseando respuesta DIAN: ' . $e->getMessage(), $invoice);
        }
    }

    private function parseStatusResponse(string $soapXml, ElectronicInvoice $invoice): array
    {
        try {
            $xml = new \SimpleXMLElement($soapXml);
            $xml->registerXPathNamespace('wcf', 'http://wcf.dian.colombia');

            $isValidNodes = $xml->xpath('//wcf:DianResponse/wcf:IsValid');
            $isValid = $isValidNodes ? ((string) $isValidNodes[0] === 'true') : false;

            $statusCodeNodes = $xml->xpath('//wcf:DianResponse/wcf:StatusCode');
            $statusCode = $statusCodeNodes ? (string) $statusCodeNodes[0] : '0';

            $statusDescNodes = $xml->xpath('//wcf:DianResponse/wcf:StatusDescription');
            $statusDesc = $statusDescNodes ? (string) $statusDescNodes[0] : '';

            $status = $isValid ? self::STATUS_ACCEPTED
                : (in_array($statusCode, ['00', '66']) ? self::STATUS_PROCESSING : self::STATUS_REJECTED);

            $result = [
                'status'         => $status,
                'track_id'       => $invoice->dian_track_id,
                'is_valid'       => $isValid,
                'status_code'    => $statusCode,
                'status_message' => $statusDesc,
                'errors'         => [],
            ];

            $this->updateInvoiceStatus($invoice, $result);
            return $result;

        } catch (\Exception $e) {
            return $this->errorResult('Error parseando estado DIAN: ' . $e->getMessage(), $invoice);
        }
    }

    // ── Actualización de estado en BD ────────────────────────────────────────

    private function updateInvoiceStatus(ElectronicInvoice $invoice, array $result): void
    {
        $updates = [
            'dian_track_id'      => $result['track_id'] ?? $invoice->dian_track_id,
            'dian_is_valid'      => $result['is_valid'] ?? false,
            'dian_status_code'   => $result['status_code'] ?? null,
            'dian_status_message'=> $result['status_message'] ?? null,
        ];

        if ($result['status'] === self::STATUS_ACCEPTED) {
            $updates['status']      = ElectronicInvoice::STATUS_ACCEPTED ?? 'accepted';
            $updates['accepted_at'] = now();
        } elseif ($result['status'] === self::STATUS_REJECTED) {
            $updates['status'] = ElectronicInvoice::STATUS_REJECTED ?? 'rejected';
        } elseif ($result['status'] === self::STATUS_PROCESSING) {
            $updates['status'] = ElectronicInvoice::STATUS_SENT ?? 'sent';
            if (!$invoice->sent_at) {
                $updates['sent_at'] = now();
            }
        }

        $invoice->update($updates);
    }

    private function extractTrackId(string $soapXml): ?string
    {
        try {
            $xml = new \SimpleXMLElement($soapXml);
            $xml->registerXPathNamespace('wcf', 'http://wcf.dian.colombia');
            $nodes = $xml->xpath('//wcf:SendBillAsyncResult');
            return $nodes ? (string) $nodes[0] : null;
        } catch (\Exception) {
            return null;
        }
    }

    // ── Utilidades ───────────────────────────────────────────────────────────

    private function endpoint(ElectronicInvoice $invoice): string
    {
        $env = $invoice->resolution->environment ?? 'habilitacion';
        return $env === 'produccion' ? self::ENDPOINT_PROD : self::ENDPOINT_HAB;
    }

    private function errorResult(string $message, ElectronicInvoice $invoice): array
    {
        Log::warning('DIAN error', ['invoice' => $invoice->full_number, 'msg' => $message]);
        $invoice->update([
            'dian_status_message' => $message,
        ]);
        return [
            'status'         => self::STATUS_ERROR,
            'track_id'       => null,
            'is_valid'       => false,
            'status_code'    => 'ERR',
            'status_message' => $message,
            'errors'         => [$message],
        ];
    }
}
