import Route from '@ember/routing/route';

export default class ConsoleBitacoraLiveReportRoute extends Route {
    beforeModel() {
        console.log('🚀 Bitacora Live Report Route: beforeModel ACTIVATED');
    }

    model() {
        console.log('🚀 Bitacora Live Report Route: model ACTIVATED');
        // No se pasan sections, el componente las cargará del backend
        return {
            stats: [
                { key: 'total', label: 'Usuarios totales', value: 32 },
                { key: 'inactive', label: 'Usuarios inactivos', value: 18 },
                { key: 'deactivated', label: 'Usuarios desactivados', value: 7 },
                { key: 'invitations', label: 'Invitaciones abiertas', value: 8 },
            ],
            roles: [
                { label: 'Administrador', value: 35 },
                { label: 'Coordinador', value: 25 },
                { label: 'Supervisor', value: 15 },
                { label: 'Operador', value: 25 },
            ],
            activities: [
                {
                    user: 'Noelia Astorga',
                    action: 'creó un rol',
                    context: 'Monitor con permisos preconfigurados',
                    time: 'Hoy 15:35',
                },
                {
                    user: 'Salvador Gamboa',
                    action: 'agregó un usuario',
                    context: 'Luis Leiva como nuevo usuario con rol de Operador.',
                    time: 'Hoy 13:45',
                },
                {
                    user: 'Noelia Astorga',
                    action: 'actualizó un rol',
                    context: 'Actualizó los permisos de 2 secciones del rol Administrador.',
                    time: '30/10/25 18:21',
                },
                {
                    user: 'Salvador Gamboa',
                    action: 'actualizó un usuario',
                    context: 'Actualizó la Unidad de negocio de María Martínez.',
                    time: '30/10/25 16:42',
                },
                {
                    user: 'Salvador Gamboa',
                    action: 'eliminó un usuario',
                    context: 'Eliminó a Carlos Ortega como usuario activo del sistema.',
                    time: '30/10/25 10:33',
                },
            ],
        };
    }
}
