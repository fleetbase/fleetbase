<?php

namespace Fleetbase\Http\Controllers\Internal\v1;

use Fleetbase\Http\Controllers\FleetbaseController;
use Fleetbase\Models\Extension;
use Fleetbase\Models\ExtensionInstall;
use Illuminate\Http\Request;

class ExtensionController extends FleetbaseController
{
    /**
     * The resource to query.
     *
     * @var string
     */
    public $resource = 'extension';

    /**
     * Retrieve all installed extensions.
     *
     * @return \Illuminate\Http\Response
     */
    public function getInstalled(Request $request)
    {
        $installedExtensions = [];

        // get all installed order configs
        $installed = ExtensionInstall::where('company_uuid', session('company'))->with('extension')->get();

        // morph installed into extensions
        foreach ($installed as $install) {
            $data      = $install->extension->toArray();
            $extension = new Extension($data);

            $extension->setAttribute('meta', $install->meta);
            $extension->setAttribute('uuid', $install->uuid);
            $extension->setAttribute('install_uuid', $install->uuid);
            $extension->setAttribute('installed', true);
            // $extension->setAttribute('is_installed', true);

            if (is_array($install->overwrite)) {
                foreach ($install->overwrite as $key => $value) {
                    $extension->setAttribute($key, $value);
                }
            }

            $installedExtensions[] = $extension;
        }

        return response()->json($installedExtensions);
    }

    /**
     * Retrieve all authored extensions.
     *
     * @return \Illuminate\Http\Response
     */
    public function getAuthored(Request $request)
    {
        return $this->model->queryFromRequest($request, function (&$query) {
            $query->where('author_uuid', session('company'));
        });
    }
}
