import { Shirt } from 'lucide-react';
import { AVATAR_SHOES_ITEMS, AVATAR_TOP_ITEMS } from './avatarCatalog';
import { AvatarShoesItemId } from './avatarTypes';
import { useAvatarState } from './useAvatarState';
import { Card, ChoiceTile } from '../shared/ui';

const shoesLabelById: Record<AvatarShoesItemId, string> = {
  shoes_none: 'Bez topánok',
  shoes_blue_sneakers_v1: 'Modré tenisky',
};

export function AvatarCustomizationSettings() {
  const { avatarState, updateAvatarState } = useAvatarState();
  const selectedTop = avatarState.config.slotSelections.top;
  const selectedShoes = avatarState.config.slotSelections.shoes;

  return (
    <Card>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-success/35 text-text-main sm:h-16 sm:w-16">
          <Shirt size={24} className="sm:h-7 sm:w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-bold leading-tight sm:text-2xl">Avatar</h3>
          <p className="mt-1 text-sm font-medium leading-snug opacity-55 sm:text-base">
            Vyberte oblečenie sprievodcu.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-5">
        <section>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-55">
            Vrchné oblečenie
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {AVATAR_TOP_ITEMS.map((item) => {
              const isSelected = item.id === selectedTop;

              return (
                <ChoiceTile
                  key={item.id}
                  shape="option"
                  state={isSelected ? 'selected' : 'neutral'}
                  unstyledState={!isSelected}
                  aria-pressed={isSelected}
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
                    {item.swatchClassName && (
                      <span
                        aria-hidden="true"
                        className={`h-5 w-5 shrink-0 rounded-full border-2 border-white/80 ${item.swatchClassName}`}
                      />
                    )}
                    <span className="truncate">{item.label}</span>
                  </span>
                </ChoiceTile>
              );
            })}
          </div>
        </section>

        <section>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide opacity-55">Topánky</h4>
          <div className="grid grid-cols-2 gap-3">
            {AVATAR_SHOES_ITEMS.map((item) => {
              const isSelected = item.id === selectedShoes;

              return (
                <ChoiceTile
                  key={item.id}
                  shape="option"
                  state={isSelected ? 'selected' : 'neutral'}
                  unstyledState={!isSelected}
                  aria-pressed={isSelected}
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
                          shoes: item.id,
                        },
                      },
                    }));
                  }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {item.swatchClassName && (
                      <span
                        aria-hidden="true"
                        className={`h-5 w-5 shrink-0 rounded-full border-2 border-white/80 ${item.swatchClassName}`}
                      />
                    )}
                    <span className="truncate">{shoesLabelById[item.id]}</span>
                  </span>
                </ChoiceTile>
              );
            })}
          </div>
        </section>
      </div>
    </Card>
  );
}
