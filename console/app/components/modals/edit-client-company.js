import Component from '@glimmer/component';

/**
 * Shared modal used to create and edit a client company. Mutates the
 * `client` object passed in via `@options.client`; the owning controller
 * reads those mutations in its confirm callback.
 *
 * Per the Task 11 whitelist, only `name` and `client_code` are editable
 * here. Tenancy fields (parent_company_uuid, company_type, is_client,
 * uuid, public_id, owner_uuid) are intentionally NOT exposed — the
 * backend hard-sets them on create and strips them on update.
 */
export default class ModalsEditClientCompanyComponent extends Component {}
