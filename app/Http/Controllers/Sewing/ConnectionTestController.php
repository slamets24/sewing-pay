<?php

namespace App\Http\Controllers\Sewing;

use App\Http\Controllers\Controller;
use App\Services\Sewing\ConnectionCheckResult;
use App\Services\Sewing\HrAzzahraClient;
use App\Services\Sewing\PackingWorkOrderClient;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Redirect;

/**
 * Tombol "Tes koneksi": cek alamat dan kunci API ke HR / Packing tanpa mengirim data sungguhan.
 */
class ConnectionTestController extends Controller
{
    public function hr(HrAzzahraClient $hr): RedirectResponse
    {
        return $this->respond($hr->ping());
    }

    public function packing(PackingWorkOrderClient $packing): RedirectResponse
    {
        return $this->respond($packing->ping());
    }

    private function respond(ConnectionCheckResult $result): RedirectResponse
    {
        return Redirect::back()->with($result->ok ? 'status' : 'error', $result->message);
    }
}
