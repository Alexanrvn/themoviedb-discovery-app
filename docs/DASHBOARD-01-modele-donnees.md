Entité Film : Identifiant TMDB (clé primaire), titre, date_sortie, résumé, note, nb_votes, popularité, durée, budget, recettes, date_observation.

Entité Genre : Identifiant TMDB (clé primaire), libellé.

Entité Pays : Code ISO (clé primaire), nom.

Relations : Un film possède 1 à N genres, et un genre caractérise 1 à N films. Un film est produit dans 1 à N pays, et un pays produit 1 à N films.

movie (id_tmdb PK, title, release_date, overview, vote_average, vote_count, popularity, runtime, budget, revenue, observation_date)

genre (id_tmdb PK, name)

country (iso_code PK, name)

movie_genre (movie_id FK, genre_id FK) - Clé primaire composite (movie_id, genre_id) pour éviter les doublons de typage

movie_country (movie_id FK, country_iso FK) - Clé primaire composite (movie_id, country_iso) pour éviter les doublons de coproduction.

INSERT INTO movie (id_tmdb, title, runtime, budget, revenue)
VALUES ($1, $2, $3, $4, $5)
ON CONFLICT (id_tmdb) DO UPDATE SET
title = EXCLUDED.title,
runtime = EXCLUDED.runtime,
budget = EXCLUDED.budget,
revenue = EXCLUDED.revenue,
observation_date = CURRENT_TIMESTAMP;

// Logique métier à documenter pour le traitement API -> Base de données
const formatMovieData = (tmdbMovie: any) => ({
id_tmdb: tmdbMovie.id,
title: tmdbMovie.title,
runtime: tmdbMovie.runtime === 0 ? null : tmdbMovie.runtime,
budget: tmdbMovie.budget === 0 ? null : tmdbMovie.budget,
revenue: tmdbMovie.revenue === 0 ? null : tmdbMovie.revenue
});
