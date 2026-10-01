import { getMovies } from '../data';

// Mock the TMDB service so no real API calls are made
jest.mock('@/services/tmdb', () => ({
  fetchContent: jest.fn(),
}));

import { fetchContent } from '@/services/tmdb';
const mockFetchContent = fetchContent as jest.MockedFunction<typeof fetchContent>;

describe('getMovies', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an array', async () => {
    mockFetchContent.mockResolvedValue([
      {
        id: 1,
        title: 'Test Movie',
        name: undefined,
        release_date: '2024-01-01',
        first_air_date: undefined,
        vote_average: 7.5,
        poster_path: '/test.jpg',
        overview: 'A test movie.',
      },
    ] as never);

    const result = await getMovies(['8'], ['movie'], 'ES');
    expect(Array.isArray(result)).toBe(true);
  });

  it('falls back to mock movies when fetchContent resolves with empty arrays', async () => {
    mockFetchContent.mockResolvedValue([] as never);

    const result = await getMovies(['8'], ['movie'], 'ES');
    expect(Array.isArray(result)).toBe(true);
    // When all results are empty, getMovies returns MOCK_MOVIES (non-empty fallback)
    expect(result.length).toBeGreaterThan(0);
  });

  it('falls back to mock movies when fetchContent throws', async () => {
    mockFetchContent.mockRejectedValue(new Error('Network error'));

    const result = await getMovies(['8'], ['movie'], 'ES');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
