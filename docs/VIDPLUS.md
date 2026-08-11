# VidPlus – Highly Customizable Embed Player for Movies, TV Shows, and Anime

Your ultimate destination for movies, TV shows, and anime. Stream your favorites with our advanced customizable player.

## Table of Contents
- Base Endpoints
- Content Types
- Player Parameters
- Examples
- Advanced Features
- Quick Start Guide
- Support & Resources

## Base Endpoints
Movies
https://player.vidplus.to/embed/movie/{tmdbId}
TV Shows
https://player.vidplus.to/embed/tv/{tmdbId}/{season}/{episode}
Anime
https://player.vidplus.to/embed/anime/{anilistId}/{episode}?dub={true/false}

## Content Types
Content Type	Source	ID Format	Required Paths
Movies	The Movie Database (TMDB)	TMDB ID	{tmdbId}
TV Shows	The Movie Database (TMDB)	TMDB ID	{tmdbId}/{season}/{episode}
Anime	AniList	AniList ID	{anilistId}/{episode}

## Player Parameters
### Playback Controls
Parameter	Type	Default	Description	Example
autoplay	boolean	true	Auto-start playback	autoplay=true
autonext	boolean	true	Auto-play next episode (TV/Anime only)	autonext=false
nextbutton	boolean	true	Show next episode button (TV/Anime only)	nextbutton=true
progress	number	-	Start position in seconds	progress=600 (10 minutes)

### Visual Customization
Parameter	Type	Default	Description	Example
primarycolor	hex	6C63FF	Primary player color (sliders, controls)	primarycolor=B20710
secondarycolor	hex	9F9BFF	Progress bar background color	secondarycolor=170000
iconcolor	hex	FFFFFF	Player icon colors	iconcolor=B20710
poster	boolean	true	Show poster/thumbnail	poster=false
title	boolean	true	Show content title	title=true

### Icon & UI Settings
Parameter	Type	Default	Description	Example
icons	string	default	Icon style: default, netflix, vid, lucide, tb	icons=netflix
servericon	boolean	true	Show server selection icon	servericon=false
setting	boolean	true	Show settings icon	setting=true
pip	boolean	true	Show picture-in-picture icon	pip=false

### Content Features
Parameter	Type	Default	Description	Example
episodelist	boolean	true	Show episode list (TV/Anime only)	episodelist=false
chromecast	boolean	true	Enable Chromecast support	chromecast=false
watchparty	boolean	false	Enable WatchParty feature	watchparty=true
download	boolean	-	Enable download functionality	download=true

### Subtitle & Font Settings
Parameter	Type	Default	Description	Example
font	string	Roboto	Font family	font=Poppins
fontcolor	hex	FFFFFF	Font/subtitle color	fontcolor=FFFF00
fontsize	number	20	Font size in pixels	fontsize=24
opacity	number	0.5	Font background opacity (0-1)	opacity=0.8

### Advanced Settings
Parameter	Type	Default	Description	Example
logourl	url	Netflix logo	Custom logo URL	logourl=https://example.com/logo.png
dub	boolean	false	Dub version for anime	dub=true
server	string	-	Server name or number (server name recommended)	server=minecloud or server=3

### Hide Controls (UI Cleanup)
Parameter	Type	Description	Example
hideprimarycolor	boolean	Hide primary color control	hideprimarycolor=true
hidesecondarycolor	boolean	Hide secondary color control	hidesecondarycolor=true
hideiconcolor	boolean	Hide icon color control	hideiconcolor=true
hideprogresscontrol	boolean	Hide progress control	hideprogresscontrol=true
hideiconset	boolean	Hide icon style control	hideiconset=true
hideautonext	boolean	Hide auto-next control	hideautonext=true
hideautoplay	boolean	Hide autoplay control	hideautoplay=true
hidenextbutton	boolean	Hide next button control	hidenextbutton=true
hideposter	boolean	Hide poster control	hideposter=true
hidetitle	boolean	Hide title control	hidetitle=true
hidechromecast	boolean	Hide Chromecast control	hidechromecast=true
hideepisodelist	boolean	Hide episode list control	hideepisodelist=true
hideservericon	boolean	Hide server icon control	hideservericon=true
hidepip	boolean	Hide PIP control	hidepip=true

## Examples
### Basic Movie Embed
<iframe 
  src="https://player.vidplus.to/embed/movie/78692" 
  frameborder="0" 
  allowfullscreen>
</iframe>

### TV Show with Custom Colors
<iframe 
  src="https://player.vidplus.to/embed/tv/94997/1/1?primarycolor=B20710&secondarycolor=170000&iconcolor=FFFFFF" 
  frameborder="0" 
  allowfullscreen>
</iframe>

### Anime with Dub
<iframe 
  src="https://player.vidplus.to/embed/anime/21/1?dub=true&autoplay=false" 
  frameborder="0" 
  allowfullscreen>
</iframe>

### Fully Customized Player
<iframe 
  src="https://player.vidplus.to/embed/movie/597?autoplay=true&primarycolor=FF6B6B&secondarycolor=4ECDC4&iconcolor=FFFFFF&poster=true&title=true&chromecast=true&icons=netflix&font=Poppins&fontcolor=FFFFFF&fontsize=20&opacity=0.8&logourl=https://example.com/logo.png" 
  frameborder="0" 
  allowfullscreen>
</iframe>

### With Custom Server
<iframe 
  src="https://player.vidplus.to/embed/movie/597?server=minecloud&autoplay=true&primarycolor=6C63FF" 
  frameborder="0" 
  allowfullscreen>
</iframe>

### Minimal UI (Cinema Mode)
<iframe 
  src="https://player.vidplus.to/embed/movie/597?hideposter=true&hidetitle=true&hidechromecast=true&hidepip=true&hideepisodelist=true&hideservericon=true" 
  frameborder="0" 
  allowfullscreen>
</iframe>

### WatchParty Enabled
<iframe 
  src="https://player.vidplus.to/embed/tv/94997/1/1?watchparty=true&autoplay=true&chromecast=true" 
  frameborder="0" 
  allowfullscreen>
</iframe>

## Advanced Features
### Color Format
Use hex colors without # prefix
Colors are automatically converted to uppercase
Example: #FF0000 becomes primarycolor=FF0000

### Responsive Design
Player automatically adapts to container size
Maintains aspect ratio on all devices
Touch-friendly controls on mobile

### Security Features
HTTPS-only embedding
CORS-protected API
Rate limiting protection

### Performance Optimization
Lazy loading support
Adaptive bitrate streaming
CDN-powered delivery

## Quick Start Guide
1. Get your content ID from TMDB (movies/shows) or AniList (anime)
2. Choose your base endpoint based on content type
3. Add customization parameters as needed
4. Embed using iframe with proper attributes

Example Workflow
```js
// 1. Get TMDB ID for "Inception" (movie ID: 27205)
// 2. Build URL with customizations
const playerUrl = "https://player.vidplus.to/embed/movie/27205" + 
  "?autoplay=true" +
  "&primarycolor=00D4FF" +
  "&secondarycolor=0099CC" +
  "&poster=true" +
  "&title=true";

// 3. Embed in your site
document.getElementById('player').innerHTML = 
  `<iframe src="${playerUrl}" frameborder="0" allowfullscreen></iframe>`;
```
