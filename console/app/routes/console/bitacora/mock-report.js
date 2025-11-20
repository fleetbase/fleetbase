import Route from '@ember/routing/route';

export default class ConsoleBitacoraMockReportRoute extends Route {
    model() {
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
            sections: [
                {
                    name: 'Gestión / Rutas',
                    slug: 'gestion-rutas',
                    total: 45,
                    trend: 12,
                    trend_direction: 'up',
                    last_activity: '2025-11-20T15:35:00Z',
                    actions: {
                        created: 20,
                        updated: 17,
                        deleted: 8,
                    },
                },
                {
                    name: 'Operación / Viajes',
                    slug: 'operacion-viajes',
                    total: 28,
                    trend: -5,
                    trend_direction: 'down',
                    last_activity: '2025-11-20T13:10:00Z',
                    actions: {
                        created: 10,
                        updated: 12,
                        deleted: 6,
                    },
                },
                {
                    name: 'Gestión / Unidades',
                    slug: 'gestion-unidades',
                    total: 15,
                    trend: 4,
                    trend_direction: 'up',
                    last_activity: '2025-11-19T18:00:00Z',
                    actions: {
                        created: 7,
                        updated: 6,
                        deleted: 2,
                    },
                },
                {
                    name: 'Gestión / Clientes',
                    slug: 'gestion-clientes',
                    total: 12,
                    trend: 8,
                    trend_direction: 'up',
                    last_activity: '2025-11-20T11:25:00Z',
                    actions: {
                        created: 6,
                        updated: 5,
                        viewed: 1,
                    },
                },
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

