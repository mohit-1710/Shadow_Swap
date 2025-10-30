export const ADMIN_KEYS = new Set<string>([
  "GJzFkncuPPCQCNszjDDHTfzm5857xcLEE9Mbb2r4qvXD",
  "3QsnGf33PAhSpXGSpZzRnPHvNAwHDUQ7jdPu71Le5jue",
])

export function isAdminAddress(address?: string | null): boolean {
  if (!address) return false
  return ADMIN_KEYS.has(address)
}

