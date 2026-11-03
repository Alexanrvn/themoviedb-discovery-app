CREATE TABLE genre (
    id_tmdb INT PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE country (
    iso_code VARCHAR(10) PRIMARY KEY,
    name VARCHAR(255) NOT NULL
);

CREATE TABLE movie (
    id_tmdb INT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    release_date DATE,
    overview TEXT,
    vote_average DECIMAL(3,1),
    vote_count INT,
    popularity DECIMAL(10,3),
    -- Les valeurs absentes (NULL) sont autorisées, mais si renseignées, doivent être > 0
    runtime INT CHECK (runtime > 0),
    budget BIGINT CHECK (budget > 0),
    revenue BIGINT CHECK (revenue > 0),
    observation_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movie_genre (
    movie_id INT REFERENCES movie(id_tmdb) ON DELETE CASCADE,
    genre_id INT REFERENCES genre(id_tmdb) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, genre_id)
);

CREATE TABLE movie_country (
    movie_id INT REFERENCES movie(id_tmdb) ON DELETE CASCADE,
    country_iso VARCHAR(10) REFERENCES country(iso_code) ON DELETE CASCADE,
    PRIMARY KEY (movie_id, country_iso)
);