# Render świata voxelami, kamera, światło

obszar: swiat
kto: -
zależy od: 001
ścieżki: render/

## Cel

Render mapy przez `InstancedMesh`, kamera z góry pod kątem, światło. Do czasu 002 użyj stubu mapy.

## Gotowe, gdy

- [x] mapa widoczna w przeglądarce, płynnie przy 64×64
- [x] jeden `InstancedMesh` na typ voxela, nie `Mesh` na voxel

Zrobione przy okazji innych kart: `render/city.ts` (InstancedMesh dla dróg, budynków, drzew), kamera i światło w `render/scene.ts`. Mapa ma najwyżej ~57×57 (`mapSizeFor`, 8 graczy).
