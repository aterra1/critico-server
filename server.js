const express = require('express');
var admin = require("firebase-admin");

var serviceAccount = require("./critico-db-firebase-adminsdk-95z8u-405cb947e8.json");



const apiURL = 'https://api.movie.com.uy/api/shows/rss/data'
const app = express();
const PORT = 3000;


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
       return res.json(desc);
        
    })
    .catch(error => res.status(500).json({ error: 'Error al obtener los datos de la API' }));
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