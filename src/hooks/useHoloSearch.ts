// Hook placeholder - search is done via API call in SearchResultsScreen
export function useHoloSearch() {
  return { loading: false, error: null, result: null, search: () => {} };
}

export function usePopularCards() {
  return { loading: false, error: null, cards: [] };
}

export function useHoloCard() {
  return { loading: false, error: null, card: null };
}

export function useAllCards() {
  return { loading: false, error: null, cards: [] };
}
