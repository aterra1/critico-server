const express = require('express');
var admin = require("firebase-admin");
const cors = require("cors")
const bodyParser = require('body-parser');
var serviceAccount = require("./critico-db-firebase-adminsdk-95z8u-405cb947e8.json");



const apiURL = 'https://api.movie.com.uy/api/shows/rss/data'
const app = express();
const PORT = 3000;

app.use(cors());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),

   // The database URL depends on the location of the database
  databaseURL: "https://critico-db.firebaseio.com"
});


const db = admin.firestore();

app.get('/shows', (req, res) => {
  fetch(apiURL)
    .then(response => response.json())
    .then(data => {
        const desc = getMovieTitles(data)
        //insertMoviesToDatabase()
        const movieTitles = getMovieTitles(data);
       // const moviesToUpdate = cinemashowsActualization(movieTitles);
       // agregarPeliculas(data)
       ObtainMoviesTittlePosterBD() 
       return res.json(desc);
        
    })
    .catch(error => res.status(500).json({ error: 'Error al obtener los datos de la API' }));
});








app.use(bodyParser.json());

// Ruta para recibir una consulta por nombre de película usando POST
app.post('/consultaPelicula', async (req, res) => {
  try {
    const nombrePelicula = req.body.nombre;

    // Realizar la consulta a la base de datos para obtener la película con el nombre dado
    const snapshot = await db.collection('movies').where('title', '==', nombrePelicula).get();

    if (snapshot.empty) {
      console.log('No se encontró la película en la base de datos.');
      return res.status(404).send('No se encontró la película.');
    }

    const peliculas = [];

    snapshot.forEach(doc => {
      const peliculaData = doc.data();
      peliculas.push(peliculaData);
    });

    return res.status(200).json(peliculas);
  } catch (error) {
    console.error('Error al realizar la consulta a la base de datos:', error);
    return res.status(500).send('Error al obtener los datos de la base de datos');
  }
});







app.get('/titlesPosterDB', async (req, res) => {
  try {
    const response = await fetch(apiURL);
    const data = await response.json();

    const desc = await ObtainMoviesTittlePosterBD();
    
    return res.json(desc);
  } catch (error) {
    console.error('Error al obtener los datos de la API:', error);
    return res.status(500).json({ error: 'Error al obtener los datos de la API' });
  }
});





app.get('/consultaDB', async (req, res) => {
  try {
    const moviesRef = db.collection('movies');
    const snapshot = await moviesRef.get();
    
    if (snapshot.empty) {
      console.log('No se encontraron documentos en la colección "movies".');
      return res.status(404).send('No se encontraron películas.');
    }
    
    const movies = [];
    snapshot.forEach(doc => {
      const movieData = doc.data();
      movies.push(movieData);
    });
    
    return res.status(200).json(movies);
  } catch (error) {
    console.error('Error al realizar la consulta a la base de datos:', error);
    return res.status(500).send('Error al obtener los datos de la base de datos');
  }
});


app.get('/poster', (req, res) => {
  fetch(apiURL)
    .then(response => response.json())
    .then(data => {
        const desc = getMoviePosterURL(data)
       return res.json(desc);
        
    })
    .catch(error => res.status(500).json({ error: 'Error al obtener los datos de la API' }));
});

app.get('/posterTitle', (req, res) => {
  fetch(apiURL)
    .then(response => response.json())
    .then(data => {
        const  poster = getMoviePosterURL(data)
        const  titles = getMovieTitles(data)

        const movieData = [];
        for (let i = 0; i < titles.length; i++) {
          movieData.push([titles[i], poster[i]]);
        }

       return res.json(movieData);
        
    })
    .catch(error => res.status(500).json({ error: 'Error al obtener los datos de la API' }));
});

app.listen(PORT, () => {
  console.log(`Servidor Express en ejecución en http://localhost:${PORT}`);
});







function getMovieTitles(json) {
    const movieTitles = [];
  
    // Recorrer el arreglo "contentCinemaShows"
    json.contentCinemaShows.forEach((content) => {
      // Obtener el título de la película y agregarlo al array
      const movieTitle = content.movie;
      movieTitles.push(movieTitle);
    });
  
    return movieTitles;
  }

  //description
  function getMovieDescription(json) {
    const movieDataTable = [];
  
    // Recorrer el arreglo "contentCinemaShows"
    json.contentCinemaShows.forEach((content) => {
      // Obtener el sinposis de la película y agregarlo al array
      const movieData = content.description;
      // pusheo en el stack
      movieDataTable.push(movieData);
    });
  
    return movieDataTable;
  }



  //poster
  function getMoviePosterURL(json) {
    const movieDataTable = [];
  
    // Recorrer el arreglo "contentCinemaShows"
    json.contentCinemaShows.forEach((content) => {
      // Obtener el sinposis de la película y agregarlo al array
      const movieData = content.posterURL;
      // pusheo en el stack
      movieDataTable.push(movieData);
    });
  
    return movieDataTable;
  }



  //trailer
  function getMovieTrailerURL(json) {
    const movieDataTable = [];
  
    // Recorrer el arreglo "contentCinemaShows"
    json.contentCinemaShows.forEach((content) => {
      // Obtener el sinposis de la película y agregarlo al array
      const movieData = content.trailerURL;
      // pusheo en el stack
      movieDataTable.push(movieData);
    });
  
    return movieDataTable;
  }



  //asigno cinemaShoes = false a todas las peliculas que no esten en la lista y true si estan 
  async function cinemashowsActualization(data) {
    try {
      // Obtener todas las películas de la base de datos
      const snapshot = await db.collection('movies').get();
      const moviesToUpdate = [];
  
      // Verificar cada película en la base de datos
      snapshot.forEach((doc) => {
        const movie = doc.data();
        const movieTitle = movie.title;
  
        // Verificar si el título de la película está en la lista de títulos a actualizar
        if (data.includes(movieTitle)) {
          // La película está en la lista, actualizar el estado a true
          movie.cinemaShows = true;
          moviesToUpdate.push(movie);
  
          // Actualizar la película en la base de datos
          db.collection('movies').doc(doc.id).update({ cinemaShows: true });
        } else {
          // La película no está en la lista, actualizar el estado a false
          movie.cinemaShows = false;
          moviesToUpdate.push(movie);
  
          // Actualizar la película en la base de datos
          db.collection('movies').doc(doc.id).update({ cinemaShows: false });
        }
      });
  
      return moviesToUpdate;
    } catch (error) {
      console.error('Error al obtener las películas de la base de datos o actualizar el estado:', error);
      throw new Error('Error al obtener las películas de la base de datos o actualizar el estado');
    }
  }
  
  // esta es la funcion que vamos a utilizar para agregar peliculas
  async function agregarPeliculas(data) {
    try {
      // Obtener todas las películas de la base de datos
      const snapshot = await db.collection('movies').get();
      const existingMovies = [];
  
      // Obtener los títulos de las películas existentes en la base de datos
      snapshot.forEach((doc) => {
        const movie = doc.data();
        const movieTitle = movie.title;
        existingMovies.push(movieTitle);
      });
  
      const moviesToAdd = [];
  
      // Verificar cada película en la respuesta de la API
      data.contentCinemaShows.forEach((movieData) => {
        const movieTitle = movieData.movie;
  
        // Verificar si el título de la película no está en la lista de películas existentes
        if (!existingMovies.includes(movieTitle)) {
          // Crear un objeto con los datos de la película a agregar
          const newMovie = {
            cinemaShows: true,
            description: movieData.description,
            poster: movieData.posterURL,
            title: movieData.movie,
            trailer: movieData.trailerURL
          };
  
          // Agregar la película a la lista de películas a agregar
          moviesToAdd.push(newMovie);
        }
      });
      
      // Agregar las películas a la base de datos
      const batch = db.batch();
      moviesToAdd.forEach((movieData) => {
        const newMovieRef = db.collection('movies').doc();
        batch.set(newMovieRef, movieData);
      });
      await batch.commit();
  
      return moviesToAdd;
    } catch (error) {
      console.error('Error al agregar las películas a la base de datos:', error);
      throw new Error('Error al agregar las películas a la base de datos');
    }
  }
  
  

  // ingreso todas las peliculas en la base de datos
  async function insertMoviesToDatabase() {
    try {
      const response = await fetch(apiURL);
      const data = await response.json();
  
      const movieTitles = getMovieTitles(data);
      const posterURLs = getMoviePosterURL(data);
      const descriptions = getMovieDescription(data);
      const trailerURL = getMovieTrailerURL(data);
      
      const movies = [];
      for (let i = 0; i < movieTitles.length; i++) {
        const movie = {
          title: movieTitles[i],
          poster: posterURLs[i],
          description: descriptions[i],
          trailer: trailerURL[i],
          cinemaShows: true
        };
        
        movies.push(movie);
  
        // Guardar la película en la base de datos
        await db.collection('movies').add(movie);
      }
  
      return movies;
    } catch (error) {
      console.error('Error al obtener los datos de la API o guardar en la base de datos:', error);
      throw new Error('Error al obtener los datos de la API o guardar en la base de datos');
    }
  }
  
// consulto la base de datos para que me retorne las tuplas titulo y posterURL en formato json
  async function ObtainMoviesTittlePosterBD() {
    try {
      const snapshot = await db.collection('movies').where('cinemaShows', '==', true).get();
  
      const movies = [];
  
      snapshot.forEach((doc) => {
        const movieData = doc.data();
        const movieTitle = movieData.title;
        const moviePosterURL = movieData.poster;
        movies.push({ title: movieTitle, posterURL: moviePosterURL });
      });
  
      return movies;
    } catch (error) {
      console.error('Error al obtener las películas en cinemaShows:', error);
      throw new Error('Error al obtener las películas en cinemaShows');
    }
  }
  