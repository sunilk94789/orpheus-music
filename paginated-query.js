/**
 * paginated-query.js
 * ─────────────────────────────────────────────────────────────
 * Cursor-based pagination helpers for Supabase REST queries.
 *
 * WHY THIS MATTERS (QA report — TC-P01, Disadvantage #8 — severity MEDIUM)
 * All songs are fetched in a single SELECT * with no limit.
 * As the library grows this causes slow loads + high bandwidth.
 * Supabase supports range()-based pagination natively.
 *
 * HOW TO USE
 * ----------
 * Replace your existing flat fetches like:
 *   const { data } = await supabase.from('songs').select('*');
 *
 * With paginated versions:
 *   import { fetchPage, createInfiniteLoader } from './paginated-query.js';
 *
 *   // Single page:
 *   const { data, hasMore } = await fetchPage('songs', { page: 0, pageSize: 20 });
 *
 *   // Infinite scroll:
 *   const loader = createInfiniteLoader('songs', {
 *     pageSize: 20,
 *     orderBy: 'trending_priority',
 *     ascending: false,
 *     onPage: (songs) => renderSongs(songs),
 *     onDone: ()      => hideLoadMoreButton(),
 *   });
 *   loadMoreButton.addEventListener('click', () => loader.next());
 * ─────────────────────────────────────────────────────────────
 */

import { supabase } from './supabase-client.js';

/**
 * Fetch a single page of rows from a Supabase table.
 *
 * @param {string} table           — Supabase table name, e.g. 'songs'
 * @param {object} opts
 * @param {number} opts.page       — zero-based page index (default: 0)
 * @param {number} opts.pageSize   — rows per page (default: 20)
 * @param {string} opts.select     — columns to select (default: '*')
 * @param {string} opts.orderBy    — column to order by (default: 'id')
 * @param {boolean} opts.ascending — sort direction (default: true)
 * @param {object} opts.filters    — key/value pairs for .eq() filters
 *
 * @returns {Promise<{data: any[], hasMore: boolean, error: string|null}>}
 */
export async function fetchPage(table, {
  page      = 0,
  pageSize  = 20,
  select    = '*',
  orderBy   = 'id',
  ascending = true,
  filters   = {},
} = {}) {
  try {
    const from = page * pageSize;
    const to   = from + pageSize - 1;

    let query = supabase
      .from(table)
      .select(select)
      .order(orderBy, { ascending })
      .range(from, to);

    for (const [col, val] of Object.entries(filters)) {
      query = query.eq(col, val);
    }

    const { data, error } = await query;
    if (error) throw error;

    return {
      data:    data ?? [],
      hasMore: data?.length === pageSize,
      error:   null,
    };
  } catch (err) {
    console.error(`[paginated-query] Error fetching ${table}:`, err.message);
    return { data: [], hasMore: false, error: err.message };
  }
}

/**
 * Create a stateful infinite-scroll loader for a table.
 *
 * @param {string} table
 * @param {object} opts
 * @param {number}   opts.pageSize  — rows per load (default: 20)
 * @param {string}   opts.select    — columns (default: '*')
 * @param {string}   opts.orderBy   — sort column
 * @param {boolean}  opts.ascending — sort direction
 * @param {object}   opts.filters   — static .eq() filters
 * @param {function} opts.onPage    — callback(rows) called with each new page
 * @param {function} opts.onDone    — callback() called when no more rows exist
 * @param {function} opts.onError   — callback(err) on failure
 *
 * @returns {{ next: function, reset: function, currentPage: number }}
 */
export function createInfiniteLoader(table, {
  pageSize  = 20,
  select    = '*',
  orderBy   = 'id',
  ascending = true,
  filters   = {},
  onPage    = () => {},
  onDone    = () => {},
  onError   = () => {},
} = {}) {
  let currentPage = 0;
  let loading     = false;
  let exhausted   = false;

  async function next() {
    if (loading || exhausted) return;
    loading = true;

    const { data, hasMore, error } = await fetchPage(table, {
      page: currentPage,
      pageSize,
      select,
      orderBy,
      ascending,
      filters,
    });

    loading = false;

    if (error) {
      onError(error);
      return;
    }

    if (data.length > 0) {
      onPage(data);
      currentPage++;
    }

    if (!hasMore) {
      exhausted = true;
      onDone();
    }
  }

  function reset() {
    currentPage = 0;
    loading     = false;
    exhausted   = false;
  }

  return { next, reset, get currentPage() { return currentPage; } };
}

/**
 * QUICK MIGRATION EXAMPLES
 * ─────────────────────────
 *
 * BEFORE (home.html trending section):
 *   const { data: songs } = await supabase
 *     .from('songs')
 *     .select('*')
 *     .order('trending_priority', { ascending: false });
 *   renderTrending(songs);
 *
 * AFTER:
 *   import { createInfiniteLoader } from './paginated-query.js';
 *   const trendingLoader = createInfiniteLoader('songs', {
 *     pageSize: 20,
 *     orderBy: 'trending_priority',
 *     ascending: false,
 *     onPage: (songs) => appendTrendingCards(songs),
 *     onDone: ()      => loadMoreBtn.style.display = 'none',
 *   });
 *   trendingLoader.next(); // initial load
 *   loadMoreBtn.addEventListener('click', () => trendingLoader.next());
 */
