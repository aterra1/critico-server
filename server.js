const express = require('express');
var admin = require("firebase-admin");
const cors = require("cors")
const bodyParser = require('body-parser');
var serviceAccount = require("./critico-db-firebase-adminsdk-95z8u-405cb947e8.json");



const apiURL = 'https://api.movie.com.uy/api/shows/rss/data'
const app = express();
const PORT = 3000;
let apiData;

app.use(cors());

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),

   // The database URL depends on the location of the database
  databaseURL: "https://critico-db.firebaseio.com"
});

const db = admin.firestore();

const interval = 10 * 60 * 60 * 1000; // 10 hours in milliseconds
setInterval(updateAPIData, interval);

// ejecuto por primera vez para actualizar la api
updateAPIData();

app.use(bodyParser.json());


app.post('/makeReview', async (req, res) => {
  try {
    const { userName, title, review, rate } = req.body;

    // Verificar si ya existe una reseña del usuario a la película
    const querySnapshot = await db.collection('review')
      .where('userName', '==', userName)
      .where('title', '==', title)
      .get();

    if (!querySnapshot.empty) {
      // Si existe una reseña, actualizar los campos 'rate' y 'review'
      const docId = querySnapshot.docs[0].id;
      await db.collection('review').doc(docId).update({
        rate,
        review
      });

      return res.status(200).send('La reseña se ha actualizado correctamente.');
    }

    // Si no existe una reseña, crear un nuevo documento en la colección 'review'
    await db.collection('review').add({
      userName,
      title,
      review,
      rate
    });

    return res.status(200).send('La reseña se ha guardado correctamente.');
  } catch (error) {
    console.error('Error al guardar o actualizar la reseña en la base de datos:', error);
    return res.status(500).send('Error al guardar o actualizar la reseña en la base de datos');
  }
});


// ingresa el usuario correo y contrasena al sistema
app.post('/signUp', async (req, res) => {
  try {
    const { userName, password, email } = req.body;
    // Verificar si ya existe un usuario con el mismo nombre de usuario
    const querySnapshot = await db.collection('user')
      .where('userName', '==', userName)
      .where('password', '==', password)
      .get();

    if (!querySnapshot.empty) {
      return res.status(400).send('El nombre de usuario ya está en uso. Por favor, elija otro nombre de usuario.');
    }

    // Crear un nuevo documento en la colección 'user'
    const newUserRef = await db.collection('user').add({
      userName,
      password,
      email
    });

    return res.status(200).send('El usuario se ha registrado correctamente.');
  } catch (error) {
    console.error('Error al registrar el usuario en la base de datos:', error);
    return res.status(500).send('Error al registrar el usuario en la base de datos');
  }
});


app.post('/searchMovie', async (req, res) => {
  try {
    const { title } = req.body;

    // Realizar la consulta a la base de datos para obtener la película con el nombre dado
    const movieSnapshot = await db.collection('movies').where('title', '==', title).get();

    if (movieSnapshot.empty) {
      console.log('No se encontró la película en la base de datos.');
      return res.status(404).send('No se encontró la película.');
    }

    const movie = movieSnapshot.docs[0].data();

    // Obtener las reseñas que coincidan con el título de la película correspondiente
    const reviewSnapshot = await db.collection('review')
      .where('title', '==', title)
      .get();

    const userReviews = reviewSnapshot.docs.map(doc => doc.data());

    let sumRates = 0;
    for (let review of userReviews) {
      sumRates += review.rate;
    }
    const averageRate = sumRates / userReviews.length;

    const responseData = {
      movie,
      userReviews,
      averageRate
    };

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error al realizar la consulta a la base de datos:', error);
    return res.status(500).send('Error al obtener los datos de la base de datos');
  }
});

app.get('/titlesPosterDB', async (req, res) => {
  try {
    
    const desc = await ObtainMoviesTittlePosterBD();
    
    return res.json(desc);
  } catch (error) {
    console.error('Error al obtener los datos de la API:', error);
    return res.status(500).json({ error: 'Error al obtener los datos de la API' });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { userName, password } = req.body;

    // Verificar si el usuario y la contraseña son válidos
    const querySnapshot = await db
      .collection('user')
      .where('userName', '==', userName)
      .where('password', '==', password)
      .get();

    if (!querySnapshot.empty) {
      // El usuario y la contraseña son correctos
      return res.status(200).send('Inicio de sesión exitoso.');
    } else {
      // El usuario o la contraseña son incorrectos
      return res.status(400).send('Usuario o contraseña incorrectos.');
    }
  } catch (error) {
    console.error('Error al realizar el inicio de sesión:', error);
    return res.status(500).send('Error al realizar el inicio de sesión.');
  }
});

// obtengo el top 10 peliculas en cartelera
app.get('/rankingShow', async (req, res) => {
  try {
    const moviesRef = db.collection('movies');
    const reviewRef = db.collection('review');

    // Obtener las películas con cinemaShows = true
    const moviesSnapshot = await moviesRef.where('cinemaShows', '==', true).get();

    const movies = [];

    // Obtener las calificaciones de las películas
    for (const movieDoc of moviesSnapshot.docs) {
      const movieData = movieDoc.data();
      const { title, poster, description } = movieData;
      // Obtener las calificaciones de la película actual
      const reviewsSnapshot = await reviewRef
        .where('title', '==', title)
        .get();

      const ratings = [];
      reviewsSnapshot.forEach(reviewDoc => {
        const reviewData = reviewDoc.data();
        ratings.push(reviewData.rate);
      });

      // Calcular el promedio de calificaciones
      let sumRating = 0
      ratings.forEach(item =>{
        sumRating = sumRating + item
      });
      //const sumRating = ratings.reduce((total, rate) => total + rate, 0);
      let averageRating = sumRating / ratings.length;


      //console.log(title+"  "+averageRating)
      
      if (isNaN(averageRating)) {
        averageRating = 0;
      }

      movies.push({
        title,
        averageRating,
        poster,
        description
      });
      
    }

    // Ordenar las películas por calificación promedio de mayor a menor
    movies.sort((a, b) => b.averageRating - a.averageRating);
    
    // Limitar a las primeras 10 películas
    const top10Movies = movies.slice(0, 10);
    return res.status(200).json(top10Movies);
  } catch (error) {
    console.error('Error al obtener el ranking de películas:', error);
    return res.status(500).send('Error al obtener el ranking de películas');
  }
});

// se obtienen todas las resenas del usuario preguntado
app.post('/userReview', async (req, res) => {
  try {
    const { userName } = req.body;
    const reviewRef = db.collection('review');
    const querySnapshot = await reviewRef.where('userName', '==', userName).get();
    const reviews = [];

    querySnapshot.forEach(reviewDoc => {
      const reviewData = reviewDoc.data();
      const { rate, title, review } = reviewData;
      
      reviews.push({ rate, title, review });
    });

    return res.status(200).json(reviews);
  } catch (error) {
    console.error('Error al obtener las reseñas del usuario:', error);
    return res.status(500).send('Error al obtener las reseñas del usuario');
  }
});

//*-*-*-*-*-*-*-*-*-*-*-*FUNCIONES*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*FUNCIONES-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*FUNCIONES--*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*-*

// funcion que actualiza la informacion recolectada desde la api
function updateAPIData() {
  fetch(apiURL)
    .then(response => response.json())
    .then(data => {
      apiData = data; // Actualizo la variable apiData
      agregarPeliculas(apiData)
      cinemashowsActualization(apiData)

      console.log('obtencion de data del api actualizada correctamente:');
    })
    .catch(error => {
      console.error('Error al actualziar api:', error);
    });
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



  //asigno cinemaShoes = false a todas las peliculas que no esten en la lista y true si estan 
  async function cinemashowsActualization(data) {
    try {
      // Obtener todas las películas de la base de datos
      const snapshot = await db.collection('movies').get();
      const moviesToUpdate = [];
      
       // obtengo las peliculas y creo una lista con los nombres
       data = getMovieTitles(data)

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


// ------------------------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------------------
// ------------------------------------------------------------------------------------------------------------------------------------------------------------



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

    const pelicula = snapshot.docs[0].data();
    

    return res.status(200).json(pelicula);
  } catch (error) {
    console.error('Error al realizar la consulta a la base de datos:', error);
    return res.status(500).send('Error al obtener los datos de la base de datos');
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
  

  