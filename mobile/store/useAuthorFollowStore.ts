import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { secureStorage } from "./secureStorage";
import api from "./api";
import { queryClient } from "./queryClient";

export interface FollowedAuthor {
  id?: string;
  name: string;
  tag?: string;
  initials: string;
  bg: string;
  followedAt: string;
}

export interface BookTasteSignal {
  bookId: string;
  title: string;
  authors: string[];
  genres: string[];
  weight: number; // e.g., 3 = favorite/completed, 2 = saved to library, 1 = viewed/searched
  updatedAt: string;
}

const AUTHOR_COLORS = [
  "#C69A5C",
  "#697A5A",
  "#C86B4F",
  "#5C7C8A",
  "#8A7C5C",
  "#7C5C8A",
];

export function getAuthorInitials(name: string): string {
  const clean = (name || "").replace(/\./g, " ").trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (clean.slice(0, 2) || "AU").toUpperCase();
}

export function getAuthorColor(name: string): string {
  let hash = 0;
  const str = name || "Author";
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AUTHOR_COLORS[Math.abs(hash) % AUTHOR_COLORS.length];
}

// Curated literary graph of related authors & genres for rich related-author recommendations
const RELATED_AUTHORS_GRAPH: Array<{
  name: string;
  headline: string;
  tag: string;
  genres: string[];
  relatedTo: string[];
  description: string;
}> = [
  {
    name: "Edgar Allan Poe",
    headline: "Architect of the Gothic",
    tag: "Gothic Fiction & Mystery",
    genres: ["Horror", "Mystery", "Gothic", "Classic", "Fiction"],
    relatedTo: ["H.P. Lovecraft", "Mary Shelley", "Bram Stoker", "Agatha Christie", "Shirley Jackson"],
    description:
      "American writer, poet, and literary critic best known for his tales of mystery, psychological depth, and the macabre.",
  },
  {
    name: "H.P. Lovecraft",
    headline: "Master of the Macabre",
    tag: "Cosmic Horror & Weird Fiction",
    genres: ["Horror", "Fantasy", "Science Fiction", "Mystery"],
    relatedTo: ["Edgar Allan Poe", "Stephen King", "Arthur Machen", "Algernon Blackwood"],
    description:
      "Pioneer of cosmic horror and weird fiction, celebrated for creating the Cthulhu Mythos and atmospheric dread.",
  },
  {
    name: "Jane Austen",
    headline: "Wit of Georgian England",
    tag: "Classic Romance & Social Satire",
    genres: ["Classic", "Romance", "Fiction", "Historical Fiction"],
    relatedTo: ["Charlotte Brontë", "Emily Brontë", "Oscar Wilde", "Virginia Woolf", "Louisa May Alcott"],
    description:
      "English novelist whose keen social observation, irony, and timeless characters defined classic romantic literature.",
  },
  {
    name: "J.R.R. Tolkien",
    headline: "Father of High Fantasy",
    tag: "Epic Fantasy & Mythopoeia",
    genres: ["Fantasy", "Adventure", "Classic", "Fiction"],
    relatedTo: ["Ursula K. Le Guin", "C.S. Lewis", "Brandon Sanderson", "George R.R. Martin", "Patrick Rothfuss"],
    description:
      "Philologist and master world-builder, author of The Hobbit and The Lord of the Rings.",
  },
  {
    name: "Ursula K. Le Guin",
    headline: "Philosopher of Worlds",
    tag: "Speculative Fiction & High Fantasy",
    genres: ["Fantasy", "Science Fiction", "Philosophy", "Fiction"],
    relatedTo: ["J.R.R. Tolkien", "Isaac Asimov", "Octavia E. Butler", "Frank Herbert"],
    description:
      "Acclaimed author of speculative fiction whose Earthsea and Hainish works blended anthropology, taoism, and deep humanity.",
  },
  {
    name: "Gabriel García Márquez",
    headline: "Pioneer of Magical Realism",
    tag: "Magical Realism & Literary Fiction",
    genres: ["Fiction", "Magical Realism", "Classic", "Literature"],
    relatedTo: ["Jorge Luis Borges", "Isabel Allende", "Julio Cortázar", "Haruki Murakami", "Virginia Woolf"],
    description:
      "Nobel Prize-winning Colombian novelist whose lyrical magical realism transformed modern world literature.",
  },
  {
    name: "Jorge Luis Borges",
    headline: "Weaver of Labyrinths",
    tag: "Metaphysical Fiction & Essays",
    genres: ["Fiction", "Philosophy", "Fantasy", "Classic"],
    relatedTo: ["Gabriel García Márquez", "Umberto Eco", "Italo Calvino", "Franz Kafka"],
    description:
      "Argentine short-story writer, essayist, and poet whose labyrinths, mirrors, and infinite libraries shaped modern fiction.",
  },
  {
    name: "Agatha Christie",
    headline: "Queen of Mystery",
    tag: "Detective Fiction & Whodunits",
    genres: ["Mystery", "Thriller", "Crime", "Fiction"],
    relatedTo: ["Arthur Conan Doyle", "Edgar Allan Poe", "Daphne du Maurier", "Gillian Flynn"],
    description:
      "Iconic mystery novelist behind Hercule Poirot and Miss Marple, master of intricate plotting and suspense.",
  },
  {
    name: "Isaac Asimov",
    headline: "Visionary of the Future",
    tag: "Hard Science Fiction & Robotics",
    genres: ["Science Fiction", "Science", "Fiction"],
    relatedTo: ["Arthur C. Clarke", "Philip K. Dick", "Frank Herbert", "Ursula K. Le Guin", "Carl Sagan"],
    description:
      "Prolific science fiction visionary known for the Foundation series and the Three Laws of Robotics.",
  },
  {
    name: "George Orwell",
    headline: "Voice of Dystopian Truth",
    tag: "Political Satire & Dystopian Fiction",
    genres: ["Classic", "Fiction", "Dystopian", "History", "Philosophy"],
    relatedTo: ["Aldous Huxley", "Ray Bradbury", "Margaret Atwood", "Franz Kafka", "Fyodor Dostoevsky"],
    description:
      "Lucid essayist and novelist whose works 1984 and Animal Farm remain touchstones of modern thought.",
  },
  {
    name: "Virginia Woolf",
    headline: "Modernist Pioneer",
    tag: "Modernist Fiction & Inner Life",
    genres: ["Classic", "Fiction", "Literature", "Biography"],
    relatedTo: ["Jane Austen", "Sylvia Plath", "James Joyce", "Oscar Wilde", "Clarice Lispector"],
    description:
      "Central figure of modernist literature whose stream-of-consciousness prose illuminated the interiority of human experience.",
  },
  {
    name: "Oscar Wilde",
    headline: "The Aesthetic Icon",
    tag: "Victorian Satire & Gothic Drama",
    genres: ["Classic", "Drama", "Philosophy", "Gothic", "Fiction"],
    relatedTo: ["Jane Austen", "Edgar Allan Poe", "Virginia Woolf", "Franz Kafka"],
    description:
      "Celebrated Irish playwright, poet, and author of The Picture of Dorian Gray, famed for his razor-sharp wit.",
  },
];

interface AuthorFollowState {
  followedAuthors: FollowedAuthor[];
  recentSearches: string[];
  likedBookSignals: BookTasteSignal[];
  hasHydratedFromServer: boolean;

  isFollowingAuthor: (nameOrId?: string) => boolean;
  toggleFollowAuthor: (author: {
    id?: string;
    name: string;
    tag?: string;
  }) => void;
  syncFromServerAuthors: (
    serverAuthors: Array<{ id?: string | number; name: string }>
  ) => void;
  recordSearchQuery: (query: string) => void;
  recordBookSignal: (signal: {
    bookId?: string;
    title?: string;
    authors?: string[] | string;
    genres?: string[] | string;
    weight?: number;
  }) => void;
}

export const useAuthorFollowStore = create<AuthorFollowState>()(
  persist(
    (set, get) => ({
      followedAuthors: [],
      recentSearches: [],
      likedBookSignals: [],
      hasHydratedFromServer: false,

      isFollowingAuthor: (nameOrId?: string) => {
        if (!nameOrId) return false;
        const target = nameOrId.trim().toLowerCase();
        if (!target || target === "unknown author") return false;
        return get().followedAuthors.some(
          (a) =>
            a.name.trim().toLowerCase() === target ||
            (a.id && String(a.id).toLowerCase() === target)
        );
      },

      toggleFollowAuthor: (authorInput) => {
        const cleanName = (authorInput.name || "").trim();
        if (!cleanName || cleanName.toLowerCase() === "unknown author") return;

        const targetLower = cleanName.toLowerCase();
        const current = get().followedAuthors;
        const exists = current.some(
          (a) =>
            a.name.trim().toLowerCase() === targetLower ||
            (authorInput.id && String(a.id) === String(authorInput.id))
        );

        const action = exists ? "unfollow" : "follow";

        if (exists) {
          set({
            followedAuthors: current.filter(
              (a) =>
                a.name.trim().toLowerCase() !== targetLower &&
                (!authorInput.id || String(a.id) !== String(authorInput.id))
            ),
          });
        } else {
          const newEntry: FollowedAuthor = {
            id: authorInput.id ? String(authorInput.id) : undefined,
            name: cleanName,
            tag: authorInput.tag || "Followed Voice",
            initials: getAuthorInitials(cleanName),
            bg: getAuthorColor(cleanName),
            followedAt: new Date().toISOString(),
          };
          set({
            followedAuthors: [newEntry, ...current],
          });
        }

        // Sync with backend asynchronously
        api
          .post("api/users/profile/authors/", {
            author_id: authorInput.id,
            author_name: cleanName,
            action,
          })
          .then((res) => {
            if (Array.isArray(res.data?.favorite_authors)) {
              const serverMap = new Map<string, string>();
              res.data.favorite_authors.forEach((sa: any) => {
                if (sa?.name && sa?.id) {
                  serverMap.set(sa.name.trim().toLowerCase(), String(sa.id));
                }
              });
              set((state) => ({
                followedAuthors: state.followedAuthors.map((fa) => ({
                  ...fa,
                  id:
                    serverMap.get(fa.name.trim().toLowerCase()) || fa.id,
                })),
              }));
            }
          })
          .catch(() => {})
          .finally(() => {
            queryClient.invalidateQueries({ queryKey: ["discoverBooks"] });
            queryClient.invalidateQueries({ queryKey: ["authorSpotlight"] });
            queryClient.invalidateQueries({ queryKey: ["basedOnHistory"] });
            queryClient.invalidateQueries({ queryKey: ["followedAuthorBooks"] });
          });
      },

      syncFromServerAuthors: (serverAuthors) => {
        if (!Array.isArray(serverAuthors) || serverAuthors.length === 0) return;
        set((state) => {
          const existingByLower = new Map(
            state.followedAuthors.map((a) => [a.name.trim().toLowerCase(), a])
          );
          let changed = false;
          for (const sa of serverAuthors) {
            if (!sa?.name) continue;
            const key = sa.name.trim().toLowerCase();
            if (!existingByLower.has(key)) {
              changed = true;
              existingByLower.set(key, {
                id: sa.id ? String(sa.id) : undefined,
                name: sa.name.trim(),
                tag: "Followed Voice",
                initials: getAuthorInitials(sa.name),
                bg: getAuthorColor(sa.name),
                followedAt: new Date().toISOString(),
              });
            }
          }
          if (!changed && state.hasHydratedFromServer) return state;
          return {
            followedAuthors: Array.from(existingByLower.values()),
            hasHydratedFromServer: true,
          };
        });
      },

      recordSearchQuery: (query) => {
        const clean = (query || "").trim();
        if (clean.length < 2) return;
        set((state) => {
          const filtered = state.recentSearches.filter(
            (q) => q.toLowerCase() !== clean.toLowerCase()
          );
          return {
            recentSearches: [clean, ...filtered].slice(0, 15),
          };
        });
      },

      recordBookSignal: (signal) => {
        const title = (signal.title || "").trim();
        if (!title) return;
        const authorsList = Array.isArray(signal.authors)
          ? signal.authors
          : typeof signal.authors === "string"
          ? signal.authors.split(",")
          : [];
        const cleanAuthors = authorsList
          .map((a) => a.trim())
          .filter((a) => a && a.toLowerCase() !== "unknown author");

        const genresList = Array.isArray(signal.genres)
          ? signal.genres
          : typeof signal.genres === "string"
          ? signal.genres.split(",")
          : [];
        const cleanGenres = genresList.map((g) => g.trim()).filter(Boolean);

        const newSignal: BookTasteSignal = {
          bookId: String(signal.bookId || title),
          title,
          authors: cleanAuthors,
          genres: cleanGenres,
          weight: signal.weight || 2,
          updatedAt: new Date().toISOString(),
        };

        set((state) => {
          const rest = state.likedBookSignals.filter(
            (s) =>
              s.bookId !== newSignal.bookId &&
              s.title.toLowerCase() !== newSignal.title.toLowerCase()
          );
          return {
            likedBookSignals: [newSignal, ...rest].slice(0, 30),
          };
        });
      },
    }),
    {
      name: "reedo-author-follow-and-taste-storage",
      storage: createJSONStorage(() => secureStorage),
    }
  )
);

export interface RecommendationSignalsSummary {
  followedAuthorNames: string[];
  savedAndLikedAuthorNames: string[];
  preferredGenres: string[];
  recentSearches: string[];
  savedBookTitles: string[];
  excludedBookIds: Set<string>;
}

export function buildRecommendationSignals(
  userBooksData: any[],
  shelves: any[],
  followedAuthors: FollowedAuthor[],
  recentSearches: string[],
  likedBookSignals: BookTasteSignal[]
): RecommendationSignalsSummary {
  const followedAuthorNames = followedAuthors.map((a) => a.name);
  const authorWeights = new Map<string, number>();
  const genreWeights = new Map<string, number>();
  const savedBookTitles: string[] = [];
  const excludedBookIds = new Set<string>();

  const favShelf = Array.isArray(shelves)
    ? shelves.find((s) => s.id === "default-favorites")
    : null;
  const favBookIds = new Set<string>(
    Array.isArray(favShelf?.bookIds) ? favShelf.bookIds.map(String) : []
  );

  if (Array.isArray(userBooksData)) {
    for (const ub of userBooksData) {
      const bId = String(ub.book_id || ub.id || "");
      if (bId) excludedBookIds.add(bId);
      if (ub.title) savedBookTitles.push(ub.title);

      const isFavorite = favBookIds.has(bId) || favBookIds.has(String(ub.id));
      const isCompletedOrReading =
        ub.status === "COMPLETED" || ub.status === "CURRENTLY_READING";
      const weight = isFavorite ? 4 : isCompletedOrReading ? 3 : 2;

      const authors: string[] = Array.isArray(ub.authors)
        ? ub.authors
        : typeof ub.author === "string"
        ? ub.author.split(",")
        : [];
      for (const rawA of authors) {
        const a = rawA.trim();
        if (a && a.toLowerCase() !== "unknown author") {
          authorWeights.set(a, (authorWeights.get(a) || 0) + weight);
        }
      }

      const genres: string[] = Array.isArray(ub.genres)
        ? ub.genres
        : typeof ub.genres === "string"
        ? ub.genres.split(",")
        : [];
      for (const rawG of genres) {
        const g = rawG.trim();
        if (g) {
          genreWeights.set(g, (genreWeights.get(g) || 0) + weight);
        }
      }
    }
  }

  for (const sig of likedBookSignals) {
    if (sig.title && !savedBookTitles.includes(sig.title)) {
      savedBookTitles.push(sig.title);
    }
    for (const a of sig.authors) {
      authorWeights.set(a, (authorWeights.get(a) || 0) + sig.weight);
    }
    for (const g of sig.genres) {
      genreWeights.set(g, (genreWeights.get(g) || 0) + sig.weight);
    }
  }

  const savedAndLikedAuthorNames = Array.from(authorWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);

  const preferredGenres = Array.from(genreWeights.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([genre]) => genre);

  return {
    followedAuthorNames,
    savedAndLikedAuthorNames,
    preferredGenres,
    recentSearches,
    savedBookTitles,
    excludedBookIds,
  };
}

export function rankBooksByRecommendationSignals<T extends Record<string, any>>(
  books: T[],
  signals: RecommendationSignalsSummary
): T[] {
  const followedLower = new Set(
    signals.followedAuthorNames.map((a) => a.toLowerCase())
  );
  const savedAuthorsLower = new Set(
    signals.savedAndLikedAuthorNames.map((a) => a.toLowerCase())
  );
  const genresLower = new Set(
    signals.preferredGenres.map((g) => g.toLowerCase())
  );
  const searchesLower = signals.recentSearches.map((q) => q.toLowerCase());

  return [...books]
    .map((book, idx) => {
      const authorStr = Array.isArray(book.authors)
        ? book.authors.join(", ")
        : String(book.author || "");
      const bookAuthors = authorStr
        .split(",")
        .map((a) => a.trim().toLowerCase())
        .filter(Boolean);

      const genreStr = Array.isArray(book.genres)
        ? book.genres.join(", ")
        : String(book.genres || "");
      const bookGenres = genreStr
        .split(",")
        .map((g) => g.trim().toLowerCase())
        .filter(Boolean);

      const titleLower = String(book.title || "").toLowerCase();

      let score = 0;

      // 1. Followed author match (+60)
      if (bookAuthors.some((ba) => followedLower.has(ba))) {
        score += 60;
      }

      // 2. Saved / liked book's author match (+35)
      if (bookAuthors.some((ba) => savedAuthorsLower.has(ba))) {
        score += 35;
      }

      // 3. Recent search query match in title, author, or genre (+30)
      if (
        searchesLower.some(
          (sq) =>
            titleLower.includes(sq) ||
            bookAuthors.some((ba) => ba.includes(sq)) ||
            bookGenres.some((bg) => bg.includes(sq))
        )
      ) {
        score += 30;
      }

      // 4. Genre overlap (+12 per matching genre)
      for (const bg of bookGenres) {
        if (genresLower.has(bg)) {
          score += 12;
        }
      }

      // 5. Preserve original relative order as gentle tie-breaker
      score -= idx * 0.1;

      return { book, score };
    })
    .sort((a, b) => b.score - a.score)
    .map((item) => item.book);
}

export function buildRelatedAuthorsSpotlight(
  apiAuthors: any[],
  signals: RecommendationSignalsSummary
): Array<{
  id: string;
  name: string;
  initials: string;
  headline: string;
  tag: string;
  reason: string;
  description: string;
}> {
  const followedLower = new Set(
    signals.followedAuthorNames.map((a) => a.toLowerCase())
  );
  const savedAuthorsLower = new Set(
    signals.savedAndLikedAuthorNames.map((a) => a.toLowerCase())
  );
  const genresLower = new Set(
    signals.preferredGenres.map((g) => g.toLowerCase())
  );
  const allSeedAuthors = [
    ...signals.followedAuthorNames,
    ...signals.savedAndLikedAuthorNames.filter(
      (a) => !followedLower.has(a.toLowerCase())
    ),
  ];

  const poolMap = new Map<
    string,
    {
      id: string;
      name: string;
      initials: string;
      headline: string;
      tag: string;
      reason: string;
      description: string;
      score: number;
    }
  >();

  // 1. Seed from curated literary graph with relationship scoring
  for (const node of RELATED_AUTHORS_GRAPH) {
    const key = node.name.toLowerCase();
    let score = 10;
    let reason = `Recommended for your literary taste`;

    // Is this author directly related to an author the user follows or saved?
    const matchedSeed = allSeedAuthors.find(
      (seed) =>
        node.relatedTo.some((r) => r.toLowerCase() === seed.toLowerCase()) ||
        RELATED_AUTHORS_GRAPH.find(
          (g) => g.name.toLowerCase() === seed.toLowerCase()
        )?.relatedTo.some((r) => r.toLowerCase() === key)
    );

    if (matchedSeed && key !== matchedSeed.toLowerCase()) {
      score += 55;
      reason = followedLower.has(matchedSeed.toLowerCase())
        ? `Related to ${matchedSeed} (Followed)`
        : `Because you read ${matchedSeed}`;
    }

    // Genre overlap with user's liked/saved books
    const matchingGenre = node.genres.find((g) =>
      genresLower.has(g.toLowerCase())
    );
    if (matchingGenre) {
      score += 25;
      if (score < 50) {
        reason = `Because you enjoy ${matchingGenre}`;
      }
    }

    // Search query match
    const matchedSearch = signals.recentSearches.find(
      (sq) =>
        node.name.toLowerCase().includes(sq.toLowerCase()) ||
        node.tag.toLowerCase().includes(sq.toLowerCase())
    );
    if (matchedSearch) {
      score += 30;
      reason = `Inspired by your search '${matchedSearch}'`;
    }

    // Prefer recommending authors the user doesn't follow yet, while still allowing followed ones later
    if (followedLower.has(key)) {
      score -= 20;
      reason = "Following • In your Literary Circle";
    } else if (savedAuthorsLower.has(key)) {
      score += 15;
      reason = "From your Library • Follow for more";
    }

    poolMap.set(key, {
      id: key,
      name: node.name,
      initials: getAuthorInitials(node.name),
      headline: node.headline,
      tag: node.tag,
      reason,
      description: node.description,
      score,
    });
  }

  // 2. Merge API authors
  if (Array.isArray(apiAuthors)) {
    for (const aa of apiAuthors) {
      if (!aa?.name) continue;
      const key = aa.name.trim().toLowerCase();
      const existing = poolMap.get(key);
      if (existing) {
        existing.id = String(aa.id || existing.id);
        if (aa.reason && existing.score <= 10) {
          existing.reason = aa.reason;
        }
      } else {
        let score = 20;
        let reason = aa.reason || "Recommended based on your library";
        if (followedLower.has(key)) {
          score -= 15;
          reason = "Following • In your Literary Circle";
        } else if (signals.followedAuthorNames.length > 0) {
          reason = `Related to ${signals.followedAuthorNames[0]}`;
          score += 25;
        }
        poolMap.set(key, {
          id: String(aa.id || key),
          name: aa.name,
          initials: aa.initials || getAuthorInitials(aa.name),
          headline: aa.headline || "Master of Storytelling",
          tag: aa.tag || "Literary Voice",
          reason,
          description:
            aa.description ||
            "Renowned author whose remarkable storytelling has left a lasting imprint on the literary world.",
          score,
        });
      }
    }
  }

  return Array.from(poolMap.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

