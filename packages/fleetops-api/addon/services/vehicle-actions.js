import Service, { inject as service } from '@ember/service';
import leafletIcon from '@fleetbase/ember-core/utils/leaflet-icon';
import getWithDefault from '@fleetbase/ember-core/utils/get-with-default';
import config from '../config/environment';

export default class VehicleActionsService extends Service {
    @service modalsManager;
    @service universe;
    @service crud;
    @service intl;

    locate(vehicle, options = {}) {
        const { location } = vehicle;
        const [latitude, longitude] = location.coordinates;

        this.modalsManager.show('modals/point-map', {
            title: this.intl.t('fleet-ops.management.vehicles.index.locate-title', { vehicleName: vehicle.displayName }),
            acceptButtonText: 'Done',
            acceptButtonIcon: 'check',
            acceptButtonIconPrefix: 'fas',
            modalClass: 'modal-md',
            hideDeclineButton: true,
            latitude,
            longitude,
            location,
            popupText: `${vehicle.displayName} (${vehicle.public_id})`,
            icon: leafletIcon({
                iconUrl: getWithDefault(vehicle, 'avatar', getWithDefault(config, 'defaultValues.vehicleAvatar')),
                iconSize: [40, 40],
            }),
            ...options,
        });
    }

    delete(vehicle, options = {}) {
        this.crud.delete(vehicle, {
            onSuccess: () => {
                this.universe.trigger('fleet-ops.vehicle.deleted', vehicle);
            },
            ...options,
        });
    }
}
