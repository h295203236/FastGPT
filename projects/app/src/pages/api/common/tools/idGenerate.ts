/**
 * 根据已有的ID生成24位ID
 * @param id 已有ID
 */
export function idGenerate(id: string | number | undefined): string | undefined {
  console.log('idGenerate', id);
  if (!id) {
    return undefined;
  }
  if (id.toString().length === 24) {
    return id.toString();
  }
  // 根据长度左边补齐0
  if (typeof id === 'number') {
    id = id.toString();
  }
  return id.padStart(24, '0');
}
