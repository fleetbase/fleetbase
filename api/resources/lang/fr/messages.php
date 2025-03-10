<?php

return [
    'otp_content' => 'Bienvenue sur FleetYes. Votre code de vérification est : :code',
    'otp_message' => 'Votre code de vérification pour :company est :code',
    'duplicate_tracking_status' => 'Le statut de suivi existe déjà ou n\'a pas pu être créé.',
    'load_not_found' => 'Commande introuvable',
    'load_confirmed_success' => 'La commande a été confirmée avec succès.',
    'invalid_approval_status' => 'Statut d\'approbation invalide.',
    'load_already_started' => 'La commande a déjà commencé.',
    'invalid_operation' => 'Opération invalide. La commande est en statut : :status.',
    'load_rejected' => 'La commande a été rejetée.',
    'duplicate_leave_requests' => 'Une demande de congé existe déjà pour la même période.',
    'request_update_success' => 'La demande de congé a été mise à jour avec succès.',
    'request_deleted_success' => 'La demande de congé a été supprimée avec succès.',
    'request_not_found' => 'La demande de congé est introuvable.',
    'invalid_activity_status' => 'Statut d\'activité invalide.',
    'status_updated_successfully' => 'Statut mis à jour avec succès',
    'order_status_updated_to_by_driver' => 'Statut de la commande mis à jour à :status par le chauffeur',
    'status' => [
        'shift-ended' => 'Fin de service',
        'on-break' => 'En Pause',
        // ... existing code ...
    ],
    'vehicle_has_active_orders' => "Impossible d'assigner ce véhicule car il est actuellement engagé dans des commandes actives. Si vous devez toujours procéder, veuillez le faire à partir des commandes associées.",
    'current_vehicle_has_active_orders' => 'Impossible de modifier ce véhicule car il est actuellement engagé dans des commandes actives. Si vous devez toujours procéder, veuillez le faire à partir des commandes associées.'
];