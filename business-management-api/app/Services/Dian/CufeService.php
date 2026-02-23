<?php

namespace App\Services\Dian;

use App\Models\ElectronicInvoice;
use App\Models\Company;

/**
 * CufeService
 *
 * Calcula el CUFE (Código Único de Factura Electrónica) y el CUDE
 * (Código Único de Documento Electrónico) según la especificación DIAN 2.1.
 *
 * Fórmula oficial DIAN:
 * CUFE = SHA-384(
 *   NumFac + FecFac + HorFac +
 *   ValFac + CodImp1 + ValImp1 + CodImp2 + ValImp2 + CodImp3 + ValImp3 +
 *   ValTot + NitOFE + NumAdq + ClTec
 * )
 *
 * Donde todos los valores numéricos se concatenan con 2 decimales exactos.
 *
 * Referencias:
 *   - Anexo Técnico de Factura Electrónica de Venta DIAN v1.9
 *   - Resolución DIAN 42 de 2020
 */
class CufeService
{
    /**
     * Genera el CUFE para una factura de venta (documento tipo 01).
     *
     * @param  array{
     *   numero_factura: string,
     *   fecha:          string,  YYYY-MM-DD
     *   hora:           string,  HH:MM:SS
     *   valor_factura:  float,   Sin impuestos
     *   valor_iva:      float,
     *   valor_inc:      float,   Impuesto Nacional al Consumo
     *   valor_ica:      float,
     *   valor_total:    float,
     *   nit_emisor:     string,  Solo dígitos, sin DV
     *   doc_adquirente: string,  Documento comprador
     *   clave_tecnica:  string,
     *   ambiente:       string,  habilitacion|produccion
     * } $data
     */
    public function calculate(array $data): string
    {
        $timeWithOffset = $this->formatTime($data['hora'], $data['ambiente'] ?? 'habilitacion');

        $string = implode('', [
            $data['numero_factura'],
            $data['fecha'],
            $timeWithOffset,
            $this->formatAmount($data['valor_factura']),
            '01',
            $this->formatAmount($data['valor_iva']),
            '04',
            $this->formatAmount($data['valor_inc']),
            '03',
            $this->formatAmount($data['valor_ica']),
            $this->formatAmount($data['valor_total']),
            $this->cleanNit($data['nit_emisor']),
            $this->cleanDocument($data['doc_adquirente']),
            $data['clave_tecnica'],
        ]);

        return hash('sha384', $string);
    }

    /**
     * Calcula el CUFE directamente desde un modelo ElectronicInvoice.
     * La empresa y la resolución deben estar cargadas (eager loading).
     */
    public function calculateFromInvoice(ElectronicInvoice $invoice): string
    {
        $company    = $invoice->company;
        $resolution = $invoice->resolution;

        if (!$company || !$resolution) {
            throw new \RuntimeException('La factura debe tener empresa y resolución cargadas.');
        }

        // La clave técnica puede estar en la resolución o en la empresa
        $claveTecnica = $resolution->technical_key ?? $company->dian_technical_key;
        if (!$claveTecnica) {
            throw new \RuntimeException('No se encontró la clave técnica DIAN.');
        }

        return $this->calculate([
            'numero_factura' => $invoice->full_number,
            'fecha'          => $invoice->issue_date->format('Y-m-d'),
            'hora'           => $invoice->issue_time ?? now()->format('H:i:s'),
            'valor_factura'  => (float) $invoice->subtotal - (float) $invoice->discount_total,
            'valor_iva'      => (float) $invoice->tax_iva,
            'valor_inc'      => (float) $invoice->tax_inc,
            'valor_ica'      => (float) $invoice->tax_ica,
            'valor_total'    => (float) $invoice->total,
            'nit_emisor'     => $company->nit,
            'doc_adquirente' => $invoice->buyer_document ?? '',
            'clave_tecnica'  => $claveTecnica,
            'ambiente'       => $resolution->environment,
        ]);
    }

    // ── Helpers privados ────────────────────────────────────────────────────────

    /** Formatea un monto con exactamente 2 decimales, sin separadores de miles */
    private function formatAmount(float $amount): string
    {
        return number_format(round($amount, 2), 2, '.', '');
    }

    /**
     * Agrega el offset de zona horaria de Colombia.
     * En habilitación la DIAN acepta -05:00 (hora estándar Colombia).
     */
    private function formatTime(string $time, string $ambiente): string
    {
        // Asegurarse del formato HH:MM:SS
        if (strlen($time) === 8) {
            return $time . '-05:00';
        }
        // Si ya viene con offset, retornar tal cual
        if (str_contains($time, '-')) {
            return $time;
        }
        return substr($time, 0, 8) . '-05:00';
    }

    /** Limpia el NIT: solo dígitos */
    private function cleanNit(string $nit): string
    {
        return preg_replace('/[^0-9]/', '', $nit);
    }

    /** Limpia el documento del adquirente: solo dígitos y letras */
    private function cleanDocument(string $doc): string
    {
        return preg_replace('/[^0-9A-Za-z]/', '', $doc);
    }

    /**
     * Verifica que el CUFE almacenado coincida con el recalculado.
     * Útil para auditorías.
     */
    public function verify(ElectronicInvoice $invoice): bool
    {
        if (!$invoice->cufe) return false;
        try {
            $recalculated = $this->calculateFromInvoice($invoice);
            return hash_equals($invoice->cufe, $recalculated);
        } catch (\Exception) {
            return false;
        }
    }
}
