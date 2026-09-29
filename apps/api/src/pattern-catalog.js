// Dashboard placement is separate from topic tags and the approaches used in attempts.
// One primary placement per problem keeps imported collections useful to browse.
export const categories = [
  ['arrays-hashing', 'Arrays & hashing', [['hashing', 'Hash maps & sets'], ['prefix-sum', 'Prefix sums']]],
  ['two-pointers', 'Two pointers', []],
  ['sliding-window', 'Sliding window', []],
  ['stack', 'Stack', [['monotonic-stack', 'Monotonic stack']]],
  ['binary-search', 'Binary search', []],
  ['linked-list', 'Linked list', []],
  ['trees', 'Trees', [['tree-dfs', 'DFS'], ['tree-bfs', 'Level order / BFS'], ['bst', 'Binary search trees'], ['segment-tree', 'Segment trees'], ['fenwick-tree', 'Fenwick trees']]],
  ['trie', 'Tries', []],
  ['heap', 'Heap / priority queue', []],
  ['backtracking', 'Backtracking', []],
  ['graphs', 'Graphs', [['graph-bfs', 'BFS'], ['graph-dfs', 'DFS'], ['union-find', 'Union find'], ['topological-sort', 'Topological sort'], ['shortest-path', 'Shortest paths'], ['mst', 'Minimum spanning trees']]],
  ['dynamic-programming', 'Dynamic programming', [['dp-1d', '1D DP'], ['dp-2d', '2D / grid DP'], ['knapsack-01', '0/1 knapsack'], ['knapsack-unbounded', 'Unbounded knapsack'], ['sequence-dp', 'Subsequence / string DP'], ['interval-dp', 'Interval DP'], ['state-machine-dp', 'State machine DP'], ['multidimensional-dp', 'Multidimensional DP']]],
  ['greedy', 'Greedy', []],
  ['intervals', 'Intervals', []],
  ['math', 'Math & geometry', []],
  ['bit-manipulation', 'Bit manipulation', []],
].map(([slug, name, children]) => ({slug, name, children: children.map(([slug, name]) => ({slug, name}))}));
const other = {slug:'other', name:'Other / needs classification', children:[]};
export const navigationCategories = [...categories, other];

// Exact identities take precedence over broad tags. Add reviewed mappings here,
// never guess a DP subtype or BFS vs DFS from an undifferentiated Graph tag.
const known = {};
function group(category, subpattern, slugs) {
  if (category === 'advanced-graphs') category = 'graphs';
  for (const slug of slugs.split(' ')) known[slug] = {category, subpattern};
}
group('arrays-hashing','hashing','two-sum contains-duplicate valid-anagram group-anagrams longest-consecutive-sequence');
group('arrays-hashing','prefix-sum','product-of-array-except-self subarray-sum-equals-k range-sum-query-immutable');
group('two-pointers',null,'3sum 4sum two-sum-ii-input-array-is-sorted valid-palindrome container-with-most-water trapping-rain-water move-zeroes sort-colors remove-duplicates-from-sorted-array');
group('sliding-window',null,'longest-substring-without-repeating-characters longest-repeating-character-replacement minimum-window-substring permutation-in-string sliding-window-maximum find-all-anagrams-in-a-string');
group('stack','monotonic-stack','daily-temperatures largest-rectangle-in-histogram next-greater-element-i next-greater-element-ii car-fleet');
group('stack',null,'valid-parentheses min-stack evaluate-reverse-polish-notation');
group('binary-search',null,'binary-search search-in-rotated-sorted-array find-minimum-in-rotated-sorted-array koko-eating-bananas median-of-two-sorted-arrays search-a-2d-matrix');
group('trees','tree-dfs','maximum-depth-of-binary-tree diameter-of-binary-tree balanced-binary-tree same-tree invert-binary-tree subtree-of-another-tree binary-tree-maximum-path-sum path-sum path-sum-ii path-sum-iii binary-tree-paths sum-root-to-leaf-numbers lowest-common-ancestor-of-a-binary-tree count-good-nodes-in-binary-tree leaf-similar-trees longest-zigzag-path-in-a-binary-tree');
group('trees','tree-bfs','binary-tree-level-order-traversal binary-tree-level-order-traversal-ii binary-tree-zigzag-level-order-traversal binary-tree-right-side-view average-of-levels-in-binary-tree minimum-depth-of-binary-tree maximum-level-sum-of-a-binary-tree populating-next-right-pointers-in-each-node populating-next-right-pointers-in-each-node-ii');
group('trees','bst','validate-binary-search-tree kth-smallest-element-in-a-bst lowest-common-ancestor-of-a-binary-search-tree');
group('graphs','graph-bfs','minimum-genetic-mutation word-ladder rotting-oranges shortest-path-in-binary-matrix open-the-lock');
group('graphs','graph-dfs','number-of-islands max-area-of-island clone-graph pacific-atlantic-water-flow surrounded-regions');
group('graphs','topological-sort','course-schedule course-schedule-ii alien-dictionary');
group('graphs','union-find','redundant-connection number-of-connected-components-in-an-undirected-graph graph-valid-tree');
group('advanced-graphs','shortest-path','network-delay-time cheapest-flights-within-k-stops swim-in-rising-water');
group('advanced-graphs','mst','min-cost-to-connect-all-points');
group('dynamic-programming','dp-1d','climbing-stairs min-cost-climbing-stairs house-robber house-robber-ii decode-ways word-break maximum-product-subarray fibonacci-number delete-and-earn integer-break arithmetic-slices domino-and-tromino-tiling minimum-cost-for-tickets count-ways-to-build-good-strings solving-questions-with-brainpower');
group('dynamic-programming','dp-2d','unique-paths unique-paths-ii minimum-path-sum triangle dungeon-game minimum-falling-path-sum minimum-falling-path-sum-ii maximal-square count-square-submatrices-with-all-ones');
group('dynamic-programming','knapsack-unbounded','coin-change coin-change-ii combination-sum-iv perfect-squares');
group('dynamic-programming','knapsack-01','partition-equal-subset-sum target-sum last-stone-weight-ii ones-and-zeroes');
group('trees','segment-tree','range-sum-query-mutable');
group('dynamic-programming','sequence-dp','longest-increasing-subsequence longest-common-subsequence edit-distance distinct-subsequences interleaving-string longest-palindromic-subsequence wildcard-matching regular-expression-matching delete-operation-for-two-strings shortest-common-supersequence minimum-ascii-delete-sum-for-two-strings uncrossed-lines maximum-length-of-repeated-subarray number-of-longest-increasing-subsequence russian-doll-envelopes longest-string-chain');
group('dynamic-programming','interval-dp','burst-balloons minimum-cost-to-cut-a-stick minimum-cost-to-merge-stones strange-printer guess-number-higher-or-lower-ii minimum-score-triangulation-of-polygon remove-boxes predict-the-winner stone-game stone-game-vii');
// LeetCode has no Interval topic tag. These exact problem identities are the
// reviewed derived family; broad Array/Sorting/Greedy tags stay as candidates
// but cannot displace the interval placement.
group('intervals',null,'merge-intervals insert-interval non-overlapping-intervals meeting-rooms meeting-rooms-ii minimum-number-of-arrows-to-burst-balloons interval-list-intersections minimum-interval-to-include-each-query find-right-interval remove-covered-intervals my-calendar-i my-calendar-ii my-calendar-iii employee-free-time remove-interval range-module divide-intervals-into-minimum-number-of-groups data-stream-as-disjoint-intervals meeting-scheduler');
group('greedy',null,'jump-game jump-game-ii gas-station hand-of-straights merge-triplets-to-form-target-triplet partition-labels valid-parenthesis-string maximum-subarray');
group('heap',null,'top-k-frequent-elements kth-largest-element-in-an-array kth-largest-element-in-a-stream last-stone-weight k-closest-points-to-origin find-median-from-data-stream task-scheduler');
group('backtracking',null,'subsets subsets-ii permutations combination-sum combination-sum-ii palindrome-partitioning word-search n-queens');
group('sliding-window',null,'best-time-to-buy-and-sell-stock');
group('greedy',null,'best-time-to-buy-and-sell-stock-ii minimum-time-to-make-rope-colorful');
group('dynamic-programming','dp-2d','pascals-triangle');
group('dynamic-programming','state-machine-dp','best-time-to-buy-and-sell-stock-with-transaction-fee best-time-to-buy-and-sell-stock-with-cooldown best-time-to-buy-and-sell-stock-iii best-time-to-buy-and-sell-stock-iv minimum-swaps-to-make-sequences-increasing count-vowels-permutation knight-dialer student-attendance-record-ii');
group('dynamic-programming','multidimensional-dp','cherry-pickup cherry-pickup-ii out-of-boundary-paths profitable-schemes paint-house-iii paths-in-matrix-whose-sum-is-divisible-by-k');
group('graphs','graph-dfs','number-of-enclaves keys-and-rooms flood-fill find-if-path-exists-in-graph all-paths-from-source-to-target');
group('graphs','graph-bfs','is-graph-bipartite 01-matrix');
group('graphs','union-find','number-of-provinces most-stones-removed-with-same-row-or-column');
group('advanced-graphs','shortest-path','path-with-minimum-effort');

// Provider topics describe possible approaches, not the approach a learner used.
// Keep every supported browsing candidate for correction, then choose one stable
// default. Specific technique tags precede broad Array and Math families.
const fallbackPriority = ['trie','linked-list','binary-search-tree','segment-tree','binary-indexed-tree','topological-sort','shortest-path','minimum-spanning-tree','union-find','trees','graphs','sliding-window','two-pointers','monotonic-stack','intervals','binary-search','heap','backtracking','dynamic-programming','greedy','stack','prefix-sum','hash-table','bit-manipulation','arrays-hashing','math'];
const topicPlacements = {
  'trie': {category:'trie',subpattern:null},
  'linked-list': {category:'linked-list',subpattern:null},
  'binary-search-tree': {category:'trees',subpattern:'bst'},
  'segment-tree': {category:'trees',subpattern:'segment-tree'},
  'binary-indexed-tree': {category:'trees',subpattern:'fenwick-tree'},
  'topological-sort': {category:'graphs',subpattern:'topological-sort'},
  'shortest-path': {category:'graphs',subpattern:'shortest-path'},
  'minimum-spanning-tree': {category:'graphs',subpattern:'mst'},
  'trees': {category:'trees',subpattern:null},
  'union-find': {category:'graphs',subpattern:'union-find'},
  'graphs': {category:'graphs',subpattern:null},
  'sliding-window': {category:'sliding-window',subpattern:null},
  'two-pointers': {category:'two-pointers',subpattern:null},
  'monotonic-stack': {category:'stack',subpattern:'monotonic-stack'},
  'intervals': {category:'intervals',subpattern:null},
  'binary-search': {category:'binary-search',subpattern:null},
  'heap': {category:'heap',subpattern:null},
  'backtracking': {category:'backtracking',subpattern:null},
  'dynamic-programming': {category:'dynamic-programming',subpattern:null},
  'greedy': {category:'greedy',subpattern:null},
  'stack': {category:'stack',subpattern:null},
  'prefix-sum': {category:'arrays-hashing',subpattern:'prefix-sum'},
  'hash-table': {category:'arrays-hashing',subpattern:'hashing'},
  'arrays-hashing': {category:'arrays-hashing',subpattern:null},
  'strings': {category:'arrays-hashing',subpattern:null},
  'sorting': {category:'arrays-hashing',subpattern:null},
  'counting': {category:'arrays-hashing',subpattern:null},
  'matrix': {category:'arrays-hashing',subpattern:null},
  'math': {category:'math',subpattern:null},
  'bit-manipulation': {category:'bit-manipulation',subpattern:null},
};

function candidate(placement, source) {
  const category = navigationCategories.find(item=>item.slug===placement.category);
  const child = category.children.find(item=>item.slug===placement.subpattern);
  return {
    ...placement,
    unit: unitForPlacement(placement),
    name: child?.name || category.name,
    categoryName: category.name,
    source,
  };
}

export function candidateUnits(problem) {
  const result=[];
  const seen=new Set();
  const add=(placement,source)=>{
    const value=candidate(placement,source);
    if(!seen.has(value.unit)){seen.add(value.unit);result.push(value);}
  };
  const exact=problem.platform==='leetcode'&&known[problem.externalId];
  if(exact) add(exact,'curated');
  const tags=new Set(problem.patternSlugs||[]);
  const addTraversalFamily=(family,dfsPlacement,bfsPlacement)=>{
    if(!tags.has(family)) return;
    const hasDfs=tags.has('depth-first-search');
    const hasBfs=tags.has('breadth-first-search');
    if(hasDfs&&hasBfs) {
      add(topicPlacements[family],'topic');
      add(dfsPlacement,'topic-combination');
      add(bfsPlacement,'topic-combination');
      return;
    }
    if(hasDfs) add(dfsPlacement,'topic-combination');
    if(hasBfs) add(bfsPlacement,'topic-combination');
  };
  addTraversalFamily('trees',{category:'trees',subpattern:'tree-dfs'},{category:'trees',subpattern:'tree-bfs'});
  addTraversalFamily('graphs',{category:'graphs',subpattern:'graph-dfs'},{category:'graphs',subpattern:'graph-bfs'});
  for(const tag of fallbackPriority) if(tags.has(tag)) add(topicPlacements[tag],'topic');
  // These provider topics share the broad arrays placement and are deliberately
  // added after named algorithmic patterns.
  for(const tag of ['strings','sorting','counting','matrix']) if(tags.has(tag)) add(topicPlacements[tag],'topic');
  return result;
}

export function classifyProblem(problem) {
  const exact = problem.platform === 'leetcode' && known[problem.externalId];
  const inferred = candidateUnits(problem)[0];
  const placement = problem.placementOverride ? placementForUnit(problem.placementOverride) : inferred || {category:'other',subpattern:null};
  const category = navigationCategories.find(c=>c.slug===placement.category);
  const child = category.children.find(c=>c.slug===placement.subpattern);
  return {...placement, unit:placement.subpattern || (category.children.length?category.slug+'-general':category.slug), name:category.name, subpatternName:child?.name || null, source:problem.placementOverride?'manual':exact?'curated':inferred?'topic-fallback':'unclassified'};
}
export function patternInventory(problems) {
  return navigationCategories.map(category=>{
    const members = problems.filter(p=>p.placement.category===category.slug);
    return {...category,count:members.length,children:(category.children.length?unitsFor(category):[]).map(child=>({...child,count:members.filter(p=>unitForPlacement(p.placement)===child.slug).length}))};
  });
}

export function unitsFor(category) {
  return category.children.length ? [...category.children,{slug:category.slug+'-general',name:'General / unspecified'}] : [{slug:category.slug,name:category.name}];
}
export const retentionUnits = navigationCategories.flatMap(category=>unitsFor(category).map(unit=>({...unit,category:category.slug,categoryName:category.name})));
export function unitForPlacement(placement) {
  const category=navigationCategories.find(c=>c.slug===placement.category);
  return placement.subpattern || (category.children.length ? category.slug+'-general' : category.slug);
}
export function placementForUnit(slug) {
  if (slug === 'advanced-graphs-general') slug = 'graphs-general';
  const unit=retentionUnits.find(u=>u.slug===slug);
  if(!unit) return null;
  const category=navigationCategories.find(c=>c.slug===unit.category);
  return {category:category.slug,subpattern:category.children.some(c=>c.slug===slug)?slug:null};
}
