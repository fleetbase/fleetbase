<?php

return [
    'otp_content' => 'Bienvenido a FleetYes. Su código de verificación es: :code',
    'otp_message' => 'Su código de verificación para :company es :code',
    'duplicate_tracking_status' => 'El estado de seguimiento ya existe o no se pudo crear.',
    'load_not_found' => 'Pedido no encontrado',
    'load_confirmed_success' => 'El pedido ha sido confirmado con éxito.',
    'invalid_approval_status' => 'Estado de aprobación no válido.',
    'load_already_started' => 'El pedido ya ha comenzado.',
    'invalid_operation' => 'Operación no válida. El pedido está en estado :status.',
    'load_rejected' => 'El pedido ha sido rechazado.',
    'duplicate_leave_requests' => 'Ya existe una solicitud de permiso para el mismo período.',
    'request_update_success' => 'La solicitud de permiso se ha actualizado correctamente.',
    'request_deleted_success' => 'La solicitud de permiso se ha eliminado correctamente.',
    'request_not_found' => 'No se ha encontrado la solicitud de permiso.',
    'invalid_activity_status' => 'Estado de actividad no válido.',
    'status_updated_successfully' => 'Estado actualizado correctamente',
    'order_status_updated_to_by_driver' => 'Estado del pedido actualizado a :status por el conductor',
    'status' => [
        'shift-ended' => 'Fin de turno',
        'on-break' => 'En Descanso',
        // ... other status translations
    ],
    'vehicle_has_active_orders' => 'No se puede asignar este vehículo ya que actualmente está involucrado en pedidos activos. Si aún necesita continuar, hágalo desde los pedidos relacionados.',
    'vehicle_already_assigned_to_another_driver' => 'Este vehículo ya está asignado a otro conductor'
];