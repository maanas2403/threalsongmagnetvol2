document.addEventListener('DOMContentLoaded', () => {
  const CLIENT_ID = '78dd5f4cae814709af30c74c31113c9c';
  const CLIENT_SECRET = '906c03f0a2f84a9d879eace46f342ceb';
  const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
  const menuBtn = document.getElementById('menuBtn');
  const sideMenu = document.getElementById('sideMenu');
  const closeBtn = document.getElementById('closeBtn');
  const topsongs = document.getElementById('TopSongs');
  const topindian = document.getElementById('TopIndianSongs');
  function restartPage() {
    location.reload();
  }
  document.getElementById('Home').addEventListener('click', restartPage);
  sideMenu.style.width = '0';
  // Function to open the side window menu
  menuBtn.addEventListener('click', () => {
    sideMenu.style.width = '250px';
  });

  // Function to close the side window menu
  closeBtn.addEventListener('click', () => {
    sideMenu.style.width = '0';
  });
  let currentlyPlayingAudio = null;
  document.getElementById('songDetails').style.display = 'none';
  document.getElementById('searchInput').addEventListener('input', function() {
    const searchTerm = this.value.trim();
    if (searchTerm.length > 0) {
      searchSong(searchTerm)
        .then(results => {
          displayResults(results);
        })
        .catch(error => {
          console.error('Error:', error);
        });
    } else {
      clearResults();
    }
  });

  document.getElementById('searchResults').addEventListener('click', async function(event) {
    document.getElementById('songDetails').style.display = 'block';
    const selectedItem = event.target.closest('.result-item');
    if (selectedItem) {
      const trackId = selectedItem.dataset.trackId;
      try {
        const trackDetails = await getTrackDetails(trackId);
        // Populate the search field with the selected song
        document.getElementById('searchInput').value = `${trackDetails.name} by ${trackDetails.artists.map(artist => artist.name).join(', ')}`;
        // Hide the options container
        clearResults();
        // Display similar songs based on the selected song
        displayTrackDetails(trackDetails);
        const similarTracks = await findSimilarTracks(trackDetails);
        displaySimilarTracks(similarTracks,trackDetails);
      } catch (error) {
        console.error('Error:', error);
      }
    }
  });

  async function findSimilarTracks(trackDetails) {
    const trackId = trackDetails.id;

    // Fetch audio features of the selected track
    const responseAudioFeatures = await fetch(`https://api.spotify.com/v1/audio-features/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    });
    const dataAudioFeatures = await responseAudioFeatures.json();
    console.log(dataAudioFeatures);
    const { danceability, energy, valence } = dataAudioFeatures;

    // Define the range for each audio feature (plus or minus 10%)

    const mindanceability = Math.max(0, danceability - 0.2);
const maxdanceability = Math.min(1, danceability + 0.2);

const minenergy = Math.max(0, energy - 0.2);
const maxenergy = Math.min(1, energy + 0.2);

const minvalence = Math.max(0, valence - 0.2);
const maxvalence = Math.min(1, valence + 0.2);

    const responseTrackDetails = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
  const trackData = await responseTrackDetails.json();
  const artistId = trackData.artists[0].id;
  const responseTopTracks = await fetch(`https://api.spotify.com/v1/artists/${artistId}/top-tracks?market=US`, {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
  const topTracksData = await responseTopTracks.json();
  const topTracks = topTracksData.tracks;
  const topTracksFiltered = [];
  for (const topTrack of topTracks) {
    const responseTopTrackAudioFeatures = await fetch(`https://api.spotify.com/v1/audio-features/${topTrack.id}`, {
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    });
    const topTrackAudioFeatures = await responseTopTrackAudioFeatures.json();

    if (topTrackAudioFeatures.danceability >= mindanceability && topTrackAudioFeatures.danceability <= maxdanceability &&
        topTrackAudioFeatures.energy >= minenergy && topTrackAudioFeatures.energy <= maxenergy &&
        topTrackAudioFeatures.valence >= minvalence && topTrackAudioFeatures.valence <= maxvalence) {
      topTracksFiltered.push(topTrack);
    }
  }
    // Use audio feature ranges to get track recommendations
    const responseRecommendations = await fetch(`https://api.spotify.com/v1/recommendations?seed_tracks=${trackId}&market=US&limit=100&min_danceability=${mindanceability}&max_danceability=${maxdanceability}&min_energy=${minenergy}&max_energy=${maxenergy}&min_valence=${minvalence}&max_valence=${maxvalence}`, {
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    });
    const dataRecommendations = await responseRecommendations.json();
    const similarTracks = dataRecommendations.tracks;
    const combinedTracks = [...similarTracks, ...topTracksFiltered];

    combinedTracks.sort((track1, track2) => {
      const diff1 = calculateDifference(track1, danceability, energy, valence);
      const diff2 = calculateDifference(track2, danceability, energy, valence);
      return diff1 - diff2;
    });

    return combinedTracks;
  }
  function calculateDifference(track, danceability, energy, valence) {
    const trackAudioFeatures = track.audio_features;
    if (!trackAudioFeatures) return Infinity; // Handle undefined audio features

    const trackDanceability = trackAudioFeatures.danceability;
    const trackEnergy = trackAudioFeatures.energy;
    const trackValence = trackAudioFeatures.valence;

    if (trackDanceability === undefined || trackEnergy === undefined || trackValence === undefined) return Infinity; // Handle undefined audio feature values

    const diffDanceability = Math.abs(trackDanceability - danceability);
    const diffEnergy = Math.abs(trackEnergy - energy);
    const diffValence = Math.abs(trackValence - valence);

    // You can customize the calculation of overall difference based on your preference
    return diffDanceability + diffEnergy + diffValence;
  }

  async function searchSong(query) {
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track`, {
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    });
    const data = await response.json();
    return data.tracks.items; // Returns an array of search results
  }

  async function getTrackDetails(trackId) {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${trackId}`, {
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    });
    const data = await response.json();
    return data; // Returns details of the track
  }

  async function searchTracksByGenres(genres) {
    const genreQuery = genres.map(genre => `genre:"${genre}"`).join(' OR ');
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(genreQuery)}&type=track`, {
      headers: {
        'Authorization': `Bearer ${await getAccessToken()}`
      }
    });
    const data = await response.json();
    return data.tracks.items; // Returns an array of search results
  }

  async function getAccessToken() {
    const tokenUrl = 'https://accounts.spotify.com/api/token';
    const basicAuthHeader = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuthHeader}`
      },
      body: 'grant_type=client_credentials'
    });
    const data = await response.json();
    return data.access_token;
  }

  function displayResults(results) {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';

    if (results.length === 0) {
      resultsContainer.innerHTML = '<p>No results found</p>';
      return;
    }

    results.forEach(result => {
      const listItem = document.createElement('div');
      listItem.classList.add('result-item');
      listItem.dataset.trackId = result.id;
      listItem.textContent = `${result.name} by ${result.artists.map(artist => artist.name).join(', ')}`;
      resultsContainer.appendChild(listItem);
    });

    resultsContainer.style.display = 'block'; // Show the dropdown
  }

  function clearResults() {
    const resultsContainer = document.getElementById('searchResults');
    resultsContainer.innerHTML = '';
    resultsContainer.style.display = 'none'; // Hide the dropdown
  }

  async function displayTrackDetails(trackDetails) {
    const trackInfoContainer = document.getElementById('songDetails');
    trackInfoContainer.innerHTML = `
    <h1> Original Song </h1>
    <img src="${trackDetails.album.images[0].url}" alt="Album Poster" width="150">
      <h4>${trackDetails.name } -  ${trackDetails.artists.map(artist => artist.name).join(', ')} </h4>
      <div>
      <audio controls>
        <source src="${trackDetails.preview_url}" type="audio/mpeg">
        Your browser does not support the audio element.
      </audio>
      </div>
      <a href="${trackDetails.external_urls.spotify}" target="_blank">Listen on Spotify</a>
    `;
    const audioElement = trackInfoContainer.querySelector('audio');
    audioElement.addEventListener('play', () => {
      // Pause the currently playing audio, if any
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audioElement) {
        currentlyPlayingAudio.pause();
      }
      // Set the currently playing audio to the current audio element
      currentlyPlayingAudio = audioElement;
    });
    audioElement.addEventListener('pause', () => {
      // Reset the currently playing audio if it's the same as the paused audio
      if (currentlyPlayingAudio === audioElement) {
        currentlyPlayingAudio = null;
      }
    });
  }

  async function displaySimilarTracks(similarTracks,trackDetails) {
    const similarhead = document.getElementById('similarhead');
    similarhead.innerHTML = '';
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '';
    
    if (similarTracks.length === 0) {
      similarTracksContainer.innerHTML = '<p>No similar tracks found</p>';
      return;
    }
    
    similarTracks.forEach(track => {
      if (track.name === trackDetails.name && track.artists.map(artist => artist.name).join(', ') === trackDetails.artists.map(artist => artist.name).join(', ')) {
        return;
    }
      const listItem = document.createElement('div');
      listItem.classList.add('results');
      listItem.innerHTML = `
        
        <img src="${track.album.images[0].url}" alt="Album Poster" width="150">
        <div>
          <h4>${track.name} - ${track.artists.map(artist => artist.name).join(', ')}</h4>
        </div>
        <div>
        <audio controls class="similar-audio">
            <source src="${track.preview_url}" type="audio/mpeg">
            Your browser does not support the audio element.
          </audio>
          </div>
          <a href="${track.external_urls.spotify}" target="_blank">Listen on Spotify</a>
      `;
      similarTracksContainer.appendChild(listItem);
      const audioElement = listItem.querySelector('audio');
      audioElement.addEventListener('play', () => {
        // Pause the currently playing audio, if any
        if (currentlyPlayingAudio && currentlyPlayingAudio !== audioElement) {
          currentlyPlayingAudio.pause();
        }
        // Set the currently playing audio to the current audio element
        currentlyPlayingAudio = audioElement;
      });
      audioElement.addEventListener('pause', () => {
        // Reset the currently playing audio if it's the same as the paused audio
        if (currentlyPlayingAudio === audioElement) {
          currentlyPlayingAudio = null;
        }
      });
    });
  }

  topsongs.addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const topSongs = await getTopSongs();
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZEVXbMDoHDwVN2tF" target="_blank"> Top 50 - Global</a></h3>';
    displayTopSongs(topSongs);
  });

  // Function to show top 10 popular instrumental songs
  topindian.addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';
    const topInstrumentalSongs = await getTopInstrumentalSongs();
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZEVXbLZ52XmnySJg" target="_blank">  Top 50 - India</a></h3>';
    displayTopSongs(topInstrumentalSongs);
  });

  // Function to display top songs or instrumental songs
  function displayTopSongs(tracks) {
    console.log(tracks);
    const similarTracksContainer = document.getElementById('similarSongs');
    if (tracks.length === 0) {
      similarTracksContainer.innerHTML = '<p>No tracks found</p>';
      return;
    }
    tracks.forEach(track => {
    const listItem = document.createElement('div');
    listItem.classList.add('results');
    listItem.innerHTML = `
      <img src="${track.album.images[0].url}" alt="Album Poster" width="150">
      <div>
        <h4>${track.name} - ${track.artists.map(artist => artist.name).join(', ')}</h4>
      </div>
      <div>
        <audio controls class="similar-audio">
          <source src="${track.preview_url}" type="audio/mpeg">
          Your browser does not support the audio element.
        </audio>
      </div>
      <a href="${track.external_urls.spotify}" target="_blank">Listen on Spotify</a>
    `;
    similarTracksContainer.appendChild(listItem);
    const audioElement = listItem.querySelector('audio');
    audioElement.addEventListener('play', () => {
      // Pause the currently playing audio, if any
      if (currentlyPlayingAudio && currentlyPlayingAudio !== audioElement) {
        currentlyPlayingAudio.pause();
      }
      // Set the currently playing audio to the current audio element
      currentlyPlayingAudio = audioElement;
    });
    audioElement.addEventListener('pause', () => {
      // Reset the currently playing audio if it's the same as the paused audio
      if (currentlyPlayingAudio === audioElement) {
        currentlyPlayingAudio = null;
      }
    });
  });
  }

  // Function to get top 10 songs
  async function getTopSongs() {
    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZEVXbMDoHDwVN2tF/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
  const data = await response.json();
  return data.items.map(item => item.track);
  }

  // Function to get top 10 instrumental songs
  async function getTopInstrumentalSongs() {
    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZEVXbLZ52XmnySJg/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
  const data = await response.json();
  return data.items.map(item => item.track);
  }

  document.getElementById('TodayHits').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DXcBWIGoYBM5M/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M" target="_blank"> Todays Top Hits</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('2000Hits').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX4o1oenSJRJd/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DX4o1oenSJRJd" target="_blank"> All out 2000s</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('90Hits').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DXbTxeAdrVG2l/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DXbTxeAdrVG2l" target="_blank"> All out 90s</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('80Hits').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX4UtSsGT1Sbe/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DX4UtSsGT1Sbe" target="_blank"> All out 80s</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('70Hits').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DWTJ7xPn4vNaz/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DWTJ7xPn4vNaz" target="_blank"> All out 70s</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('60Hits').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DXaKIA8E7WcJj/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DXaKIA8E7WcJj" target="_blank"> All out 60s</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('50Hits').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DWSV3Tk4GO2fq/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DWSV3Tk4GO2fq" target="_blank"> All out 50s</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('SoftPop').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DWTwnEm1IYyoj/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DWTwnEm1IYyoj" target="_blank"> Soft Pop Hits</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('RockParty').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX8FwnYE6PRvL/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DX8FwnYE6PRvL" target="_blank"> Rock Party</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('classicHardcore').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DXaGNG7NmtmZv/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DXaGNG7NmtmZv" target="_blank"> Classic Hardcore</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('wildCountry').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX5mB2C8gBeUM/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DX5mB2C8gBeUM" target="_blank"> Wild Country</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('danceClassics').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX8a1tdzq5tbM/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DX8a1tdzq5tbM" target="_blank"> Dance Classic</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('RapStream').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX58gKmCfKS2T/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DX58gKmCfKS2T" target="_blank"> Most Streamed Rap</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('rap91').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX1ct2TQrAvRf/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DX1ct2TQrAvRf" target="_blank"> Rap 91 - Indian Rap</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('oldgold').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DWYRTlrhMB12D/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DWYRTlrhMB12D" target="_blank"> Old is Gold- Bollywood</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('bollydance').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DX8xfQRRX1PDm/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DX8xfQRRX1PDm" target="_blank"> Bollywood Dance Music</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('sadhindi').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DXdFesNN9TzXT/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DXdFesNN9TzXT" target="_blank"> Sad Hindi Melodies</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('90ssadhindi').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/37i9dQZF1DWX7nMmBhSzhN/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/37i9dQZF1DWX7nMmBhSzhN" target="_blank"> 90s Sad Bollywood</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('MostStreamed').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/5ABHKGoOzxkaa28ttQV9sE/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/5ABHKGoOzxkaa28ttQV9sE" target="_blank">Most Streamed - Spotify</a></h3>';
    displayTopSongs(topSongs);
    
  });
  document.getElementById('2000sbolly').addEventListener('click', async function(event)  {
    clearResults();
    document.getElementById('songDetails').style.display = 'none';
    document.getElementById('searchInput').style.display = 'none';

    const response = await fetch('https://api.spotify.com/v1/playlists/2Kj5NUtVetggUDHPIGC9U7/tracks', {
    headers: {
      'Authorization': `Bearer ${await getAccessToken()}`
    }
  });
    const data = await response.json();
    const topSongs = data.items.map(item => item.track);
    const similarTracksContainer = document.getElementById('similarSongs');
    similarTracksContainer.innerHTML = '<h3><a href="https://open.spotify.com/playlist/2Kj5NUtVetggUDHPIGC9U7" target="_blank">2000s Bollywood</a></h3>';
    displayTopSongs(topSongs);
    
  });
});
