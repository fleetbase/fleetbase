import ApplicationSerializer from '@fleetbase/ember-core/serializers/application';
import { EmbeddedRecordsMixin } from '@ember-data/serializer/rest';

export default class TwoFaSettingsSerializer extends ApplicationSerializer.extend(EmbeddedRecordsMixin) {}
