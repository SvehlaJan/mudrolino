import { Shirt } from 'lucide-react';
import { AVATAR_TOP_ITEMS } from './avatarCatalog';
import { useAvatarState } from './useAvatarState';
import { Card, ChoiceTile } from '../shared/ui';

const swatchClassName: Record<string, string> = {
  top_blue_tshirt: 'bg-accent-blue',
  top_green_hoodie: 'bg-success',
};

export function AvatarCustomizationSettings() {
  const { avatarState, updateAvatarState } = useAvatarState();
  const selectedTop = avatarState.config.slotSelections.top;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-success/35 text-text-main sm:h-16 sm:w-16">
          <Shirt size={24} className="sm:h-7 sm:w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight sm:text-2xl">Avatar</h3>
          <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
            Vyberte vrchné oblečenie sprievodcu.
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {AVATAR_TOP_ITEMS.map((item) => {
          const isSelected = item.id === selectedTop;

          return (
            <ChoiceTile
              key={item.id}
              shape="option"
              state={isSelected ? 'selected' : 'neutral'}
              unstyledState={!isSelected}
              className={
                isSelected
                  ? 'bg-success text-white'
                  : 'bg-bg-light text-text-main opacity-80 shadow-none'
              }
              onClick={() => {
                updateAvatarState((state) => ({
                  ...state,
                  config: {
                    ...state.config,
                    slotSelections: {
                      ...state.config.slotSelections,
                      top: item.id,
                    },
                  },
                }));
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden="true"
                  className={`h-5 w-5 shrink-0 rounded-full border-2 border-white/80 ${swatchClassName[item.id]}`}
                />
                <span className="truncate">{item.label}</span>
              </span>
            </ChoiceTile>
          );
        })}
      </div>
    </Card>
  );
}
