import { buttonVariants, cn } from './variants';

const primary = buttonVariants({ tone: 'primary', size: 'child' });
if (!primary.includes('min-h-12')) throw new Error('Child target is below 48px');
if (!primary.includes('bg-action-primary')) throw new Error('Primary token missing');
if (primary.includes('!')) throw new Error('Important modifier leaked into variant');

const merged = cn('px-2 bg-white', 'px-4');
if (merged.includes('px-2') || !merged.includes('px-4')) {
  throw new Error(`Unexpected merge result: ${merged}`);
}
console.log('✓ UI variant contracts passed');
