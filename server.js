const express = require('express');
const firebase = require('firebase')

const apiURL = 'https://api.movie.com.uy/api/shows/rss/data'
const app = express();
const PORT = 3000;

const firebaseConfig = {
  apiKey: "AIzaSyCphEXFWSWHR1d--C-iIrT7fMPyT1vh1U0",
  authDomain: "critico-db.firebaseapp.com",
  projectId: "critico-db",
  storageBucket: "critico-db.appspot.com",
  messagingSenderId: "719151759897",
  appId: "1:719151759897:web:227df10a843a9c1db0e088",
  measurementId: "G-GB0WC0M273"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

app.get('/shows', (req, res) => {
  fetch(apiURL)
    .then(response => response.json())
    .then(data => {
        const desc = getMovieTitles(data)
       return res.json(desc);
        
    })
    .catch(error => res.status(500).json({ error: 'Error al obtener los datos de la API' }));
});

app.get('/consultaBD', (req, res) => {
  (async()=>{
    try{
      let response = []

      await db.collection('movies').get().then(querysnapshot =>{
        let docs = querysnapshot.docs;

        for(let doc of docs){
          response.push(doc.data())
        }
        return res.status(200).send(response)
      })
    }catch(error){
      return res.status(500).send(error)
    }
  })
})

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