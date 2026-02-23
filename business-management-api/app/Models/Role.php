<?php

namespace App\Models;

use Spatie\Permission\Models\Role as SpatieRole;

/**
 * App\Models\Role
 *
 * Extiende el modelo de Spatie para mantener compatibilidad
 * con el código legado que usa App\Models\Role directamente.
 * La tabla 'roles' y la relación users() las gestiona Spatie.
 */
class Role extends SpatieRole
{
    // Hereda todo de Spatie incluyendo users() como BelongsToMany.
    // No redefinimos users() para evitar conflicto de firma.
}
