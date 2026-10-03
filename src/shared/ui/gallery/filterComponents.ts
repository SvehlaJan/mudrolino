export interface GalleryComponent {
  name: string;
  source: string;
  category: string;
  exported: boolean;
  usages: readonly string[];
}

export function filterComponents(components: readonly GalleryComponent[], query: string, category: string): GalleryComponent[] {
  const search = query.trim().toLocaleLowerCase();
  return components.filter(component => (category === 'all' || component.category === category)
    && [component.name, component.source, component.category, ...component.usages].some(value => value.toLocaleLowerCase().includes(search)));
}
