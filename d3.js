async function init() {
    try {
        // load csv
        const data = await d3.csv("top200_charts_us_ca_mx.csv");
        
        // sanity check data
        console.log("Successfully loaded CSV"); 
        console.log("Total rows:", data.length);
        console.log("Columns:", data.columns);
        console.log("First 5 rows:", data.slice(0, 5));
        
        // convert rank and stream to numbers and convert date to date object
        data.forEach(d => {
            d.rank = +d.rank;
            d.streams = +d.streams;
            // split date parsing to avoid timezone problems
            const dateParts = d.date.split('-');
            d.date = new Date(+dateParts[0], +dateParts[1] - 1, +dateParts[2]);
        });
        
        // Debug: Check what regions are actually in the data
        const uniqueRegions = [...new Set(data.map(d => d.region))]; 
        
        // setup sliders after data is loaded
        setupDateSlider(data);
        setupTopSongsSlider();
        setupCheckboxListeners();
        setupViewSelector();
        
        // create chart initial chart
        createChart(data);
        
        return data;
    } catch (error) {
        console.error("Error loading CSV:", error);
        throw error;
    }
}

// function to create the date slider
function setupDateSlider(data) {
    // get distinct dates and sort them
    const uniqueDates = [...new Set(data.map(d => d.date.getTime()))].sort();
    const dateObjects = uniqueDates.map(time => new Date(time));
    
    // get date slider and set values
    const dateSlider = document.getElementById('date-slider');
    dateSlider.min = 0;
    dateSlider.max = uniqueDates.length - 32;
    dateSlider.value = 0; // Start with oldest date
    console.log("Unique dates:", uniqueDates);
    // format date
    function formatDate(date) {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
    
    // event listener for date slider so that the date changes as the slider moves
    const dateValue = document.getElementById('date-value');
    dateValue.textContent = formatDate(dateObjects[dateSlider.value]); // Set initial value
     
    dateSlider.addEventListener('input', function() {
        const selectedDate = dateObjects[this.value];
        dateValue.textContent = formatDate(selectedDate);
        // Update chart when date changes
        if (typeof updateChart === 'function') {
            updateChart();
        }
    });
}

// function to create the top songs slider
function setupTopSongsSlider() {
    // setup top songs slider 
    const topSongsSlider = document.getElementById('top-songs-slider');
    const topSongsValue = document.getElementById('top-songs-value');
    
    // event listener for top songs slider so the number of top songs displayed changes as the slider moves
    topSongsSlider.addEventListener('input', function() {
        topSongsValue.textContent = this.value;
        if (typeof updateChart === 'function') {
            updateChart();
        }
    });
}

// listen for checkbox changes
function setupCheckboxListeners() {
    const usCheckbox = document.getElementById('us-checkbox');
    const mxCheckbox = document.getElementById('mx-checkbox');
    const caCheckbox = document.getElementById('ca-checkbox');
    
    // event listeners for checkboxes to update page when the checkboxes change
    [usCheckbox, mxCheckbox, caCheckbox].forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            if (currentView === 'overview') {
                updateChart();
            } else if (currentView === 'artists') {
                updateArtistView();
            } else if (currentView === 'songs') {
                updateSongView();
            }
        }); 
    });
}

// keep track current view
let currentView = 'overview';

// setup view selector functionality
function setupViewSelector() {
    const viewButtons = document.querySelectorAll('.view-btn');
    
    viewButtons.forEach(button => { 
        button.addEventListener('click', function() {
            // take off active from the buttons
            viewButtons.forEach(btn => {
                btn.classList.remove('active');
                btn.style.backgroundColor = 'transparent';
                btn.style.color = '#333';
                btn.style.fontWeight = 'normal';
            });
            
            // make the button clicked appear active and update the page
            this.classList.add('active');
            this.style.backgroundColor = 'steelblue';
            this.style.color = 'white';
            this.style.fontWeight = 'bold';
            // clear any existing chart elements before switching
            d3.select("#chart svg g").selectAll("*").remove();
            d3.selectAll(".pinned-tooltip").remove();
            d3.selectAll(".tooltip").remove();
            if (this.id === 'view-overview') {
                currentView = 'overview';
                showOverviewControls();
                updateChart();
            } else if (this.id === 'view-artists') {
                currentView = 'artists';
                // check US be default
                if (!document.getElementById('mx-checkbox').checked && 
                    !document.getElementById('ca-checkbox').checked) { 
                    document.getElementById('us-checkbox').checked = true;
                }
                showArtistControls();
                updateArtistView();
            } else if (this.id === 'view-songs') {
                currentView = 'songs';
                // check us by default
                if (!document.getElementById('mx-checkbox').checked && 
                    !document.getElementById('ca-checkbox').checked) {
                    document.getElementById('us-checkbox').checked = true;
                }
                showSongControls();
                updateSongView();
            }
        });
    });
}

// change controls based on selected tab
function showOverviewControls() {
    const controlDivs = document.querySelectorAll('body > div');
    controlDivs.forEach(div => {
        if (div.querySelector('#us-checkbox') || div.querySelector('#date-slider') || div.querySelector('#top-songs-slider')) {
            div.style.display = 'block';
        }
    });
    
    // remove artist and song specific controls
    const artistSliderDiv = document.getElementById('artist-slider-div');
    if (artistSliderDiv) {
        artistSliderDiv.style.display = 'none'; 
    }
    const songSliderDiv = document.getElementById('song-slider-div');
    if (songSliderDiv) {
        songSliderDiv.style.display = 'none';
    }
}

// show controls for artist page
function showArtistControls() {
    // remove date and artist slider and check the us box
    const controlDivs = document.querySelectorAll('body > div');
    controlDivs.forEach(div => {
        if (div.querySelector('#date-slider') || div.querySelector('#top-songs-slider')) {
            div.style.display = 'none';
        }
        if (div.querySelector('#us-checkbox')) {
            div.style.display = 'block';
        }
    });
     
    // put in artist count slider
    let artistSliderDiv = document.getElementById('artist-slider-div');
    if (!artistSliderDiv) {
        const controlsContainer = document.querySelector('div:has(#us-checkbox)');
        artistSliderDiv = document.createElement('div');
        artistSliderDiv.id = 'artist-slider-div';
        artistSliderDiv.innerHTML = `
            <div style="margin: 10px 0;">
                <label for="artist-count-slider">Top Artists:</label>
                <input type="range" id="artist-count-slider" min="1" max="50" step="1" value="20">
                <span id="artist-count-value">20</span>
            </div>
            <div style="margin: 10px 0;">
                <label for="artist-sort-select">Sort by:</label>
                <select id="artist-sort-select" style="margin-left: 5px;">
                    <option value="streams">Total Streams</option>
                    <option value="weeks">Weeks on Chart</option>
                </select>
            </div>
        `;
        controlsContainer.parentNode.insertBefore(artistSliderDiv, controlsContainer.nextSibling);
        
        //  create event listener for artist slider and dropdown
        const artistSlider = document.getElementById('artist-count-slider');
        const artistValue = document.getElementById('artist-count-value');
        artistSlider.addEventListener('input', function() {
            artistValue.textContent = this.value;
            if (currentView === 'artists') {
                updateArtistView(); 
            }
        });
        const sortSelect = document.getElementById('artist-sort-select');
        sortSelect.addEventListener('change', function() {
            if (currentView === 'artists') {
                updateArtistView();
            }
        });
    }
    artistSliderDiv.style.display = 'block';
    
    // delete song-specific controls
    const songSliderDiv = document.getElementById('song-slider-div');
    if (songSliderDiv) { 
        songSliderDiv.style.display = 'none';
    }
}

// show controls for song page
function showSongControls() {
    // put country controls for song performance view and get rid of date slider and song slider
    const controlDivs = document.querySelectorAll('body > div');
    controlDivs.forEach(div => {
        if (div.querySelector('#date-slider') || div.querySelector('#top-songs-slider')) {
            div.style.display = 'none';
        }
        if (div.querySelector('#us-checkbox')) {
            div.style.display = 'block';
        } 
    });
    
    //remove artist-specific controls
    const artistSliderDiv = document.getElementById('artist-slider-div');
    if (artistSliderDiv) {
        artistSliderDiv.style.display = 'none';
    }
    
    // make song slider
    let songSliderDiv = document.getElementById('song-slider-div');
    if (!songSliderDiv) {
        const controlsContainer = document.querySelector('div:has(#us-checkbox)');
        songSliderDiv = document.createElement('div');
        songSliderDiv.id = 'song-slider-div';
        songSliderDiv.innerHTML = `
            <div style="margin: 10px 0;">
                <label for="song-count-slider">Top Songs:</label>
                <input type="range" id="song-count-slider" min="1" max="100" step="1" value="50">
                <span id="song-count-value">50</span>
            </div>
        `;
        controlsContainer.parentNode.insertBefore(songSliderDiv, controlsContainer.nextSibling);
        
        // event listener for song slider
        const songSlider = document.getElementById('song-count-slider');
        const songValue = document.getElementById('song-count-value');
        songSlider.addEventListener('input', function() {
            songValue.textContent = this.value;
            if (currentView === 'songs') {
                updateSongView();
            } 
        });
    }
    songSliderDiv.style.display = 'block';
}

// update for artist view clicked
function updateArtistView() {
    // remove existing chart
    d3.select("#chart svg g").selectAll("*").remove();
    d3.selectAll(".pinned-tooltip").remove();
    
    // Update title and create artist viz
    updateArtistTitle();
    createArtistVisualization();
}

// do the artist title
function updateArtistTitle() {
    // get selected countries
    const selectedCountries = [];
    if (document.getElementById('us-checkbox').checked) {
        selectedCountries.push('United States');
    }
    if (document.getElementById('mx-checkbox').checked) {
        selectedCountries.push('Mexico');
    }   
    if (document.getElementById('ca-checkbox').checked) {
        selectedCountries.push('Canada');
    }
    let countryText = '';
    if (selectedCountries.length === 0) {
        countryText = 'no countries selected';
    } else {
        const coloredCountries = selectedCountries.map(country => {
            let color = '';
            if (country === 'United States') color = 'steelblue';
            else if (country === 'Mexico') color = 'green';
            else if (country === 'Canada') color = 'red';
            return `<span style="color: ${color}; font-weight: bold;">${country}</span>`;
        });
        
        if (selectedCountries.length === 1) {
            countryText = coloredCountries[0];
        } else if (selectedCountries.length === 2) {
            countryText = coloredCountries.join(' and ');
        } else {
            countryText = coloredCountries.slice(0, -1).join(', ') + ', and ' + coloredCountries[coloredCountries.length - 1];
        } 
    }
    
    const artistCount = document.getElementById('artist-count-slider') ? document.getElementById('artist-count-slider').value : 20;
    
    // change title
    const titleElement = document.getElementById('chart-title');
    if (selectedCountries.length === 0) {
        titleElement.textContent = 'Select countries to view top artists';
    } else {
        titleElement.innerHTML = `Top ${artistCount} Artists by Total Streams for ${countryText}`;
    }
}

// update last song page
function updateSongView() {
    // remove existing chart
    d3.select("#chart svg g").selectAll("*").remove();
    d3.selectAll(".pinned-tooltip").remove();
    
    // Update title and create song viz
    updateSongTitle();
    createSongVisualization();
} 

// do the song title
function updateSongTitle() {
    // get selected countries
    const selectedCountries = [];
    if (document.getElementById('us-checkbox').checked) {
        selectedCountries.push('United States');
    }
    if (document.getElementById('mx-checkbox').checked) {
        selectedCountries.push('Mexico');
    }
    if (document.getElementById('ca-checkbox').checked) {
        selectedCountries.push('Canada');
    }
    let countryText = '';
    if (selectedCountries.length === 0) {
        countryText = 'all countries'; 
    } else {
        const coloredCountries = selectedCountries.map(country => {
            let color = '';
            if (country === 'United States') color = 'steelblue';
            else if (country === 'Mexico') color = 'green';
            else if (country === 'Canada') color = 'red';
            return `<span style="color: ${color}; font-weight: bold;">${country}</span>`;
        });
        
        if (selectedCountries.length === 1) {
            countryText = coloredCountries[0];
        } else if (selectedCountries.length === 2) {
            countryText = coloredCountries.join(' and ');
        } else {
            countryText = coloredCountries.slice(0, -1).join(', ') + ', and ' + coloredCountries[coloredCountries.length - 1];
        }
    }
    
    const songCount = document.getElementById('song-count-slider') ? document.getElementById('song-count-slider').value : 50;
    
    // change title
    const titleElement = document.getElementById('chart-title');
    titleElement.innerHTML = `Top ${songCount} Song Performance Analysis for ${countryText}`;
}

// make the artist visual
function createArtistVisualization() {
    // get countries
    const selectedCountry = [];
    const regionMappings = {
        us: ['United States', 'US', 'us'],
        mx: ['Mexico', 'MX', 'mx'], 
        ca: ['Canada', 'CA', 'ca'] 
    };
    if (document.getElementById('us-checkbox').checked) {
        selectedCountry.push(...regionMappings.us);
    }
    if (document.getElementById('mx-checkbox').checked) {
        selectedCountry.push(...regionMappings.mx);
    }
    if (document.getElementById('ca-checkbox').checked) {
        selectedCountry.push(...regionMappings.ca);
    }
    if (selectedCountry.length === 0) return;
    
    // filter data by country
    const filteredData = chartData.filter(d => selectedCountry.includes(d.region));
    const artistData = {};
    filteredData.forEach(d => {
        if (!artistData[d.artist]) {
            artistData[d.artist] = {
                artist: d.artist,
                'United States': 0,
                'Mexico': 0,
                'Canada': 0,
                total: 0,
                weeksOnChart: 0,
                chartEntries: new Set() // Track unique date-country combinations
            };
        }
        let country = d.region;
        if (regionMappings.us.includes(d.region)) country = 'United States';
        else if (regionMappings.mx.includes(d.region)) country = 'Mexico';
        else if (regionMappings.ca.includes(d.region)) country = 'Canada';
        
        artistData[d.artist][country] += d.streams;
        artistData[d.artist].total += d.streams; 
        
        // get weeks on chart
        const dateKey = `${d.date.getTime()}-${country}`;
        artistData[d.artist].chartEntries.add(dateKey);
    });
    
    //change chart entries to weeks count
    Object.values(artistData).forEach(artist => {
        artist.weeksOnChart = artist.chartEntries.size;
        delete artist.chartEntries;
    });
    
    // figure out which way to sort
    const sortBy = document.getElementById('artist-sort-select') ? document.getElementById('artist-sort-select').value : 'streams';
    const artistCount = document.getElementById('artist-count-slider') ? parseInt(document.getElementById('artist-count-slider').value) : 20;
    const topArtists = Object.values(artistData)
        .sort((a, b) => {
            if (sortBy === 'weeks') {
                return b.weeksOnChart - a.weeksOnChart;
            } else {
                return b.total - a.total;
            }
        })
        .slice(0, artistCount);
    
    // figure out which countries to stack
    const stackKeys = [];
    if (document.getElementById('us-checkbox').checked) stackKeys.push('United States');
    if (document.getElementById('mx-checkbox').checked) stackKeys.push('Mexico'); 
    if (document.getElementById('ca-checkbox').checked) stackKeys.push('Canada'); 
    
    // Change data for weeks view
    let dataForStack = topArtists;
    if (sortBy === 'weeks') {
        dataForStack = topArtists.map(artist => {
            const newArtist = { ...artist };
            // calculate weeks per country for this artist
            const artistWeeksData = {};
            chartData.forEach(d => {
                if (d.artist === artist.artist && selectedCountry.includes(d.region)) {
                    let country = d.region;
                    if (regionMappings.us.includes(d.region)) country = 'United States';
                    else if (regionMappings.mx.includes(d.region)) country = 'Mexico';
                    else if (regionMappings.ca.includes(d.region)) country = 'Canada';
                    
                    if (!artistWeeksData[country]) {
                        artistWeeksData[country] = new Set();
                    }
                    artistWeeksData[country].add(d.date.getTime());
                }
            });
            
            // save weeks count for each country for artist
            newArtist['United States'] = artistWeeksData['United States'] ? artistWeeksData['United States'].size : 0;
            newArtist['Mexico'] = artistWeeksData['Mexico'] ? artistWeeksData['Mexico'].size : 0;
            newArtist['Canada'] = artistWeeksData['Canada'] ? artistWeeksData['Canada'].size : 0; 
            
            return newArtist;
        });
    }
    
    const stack = d3.stack().keys(stackKeys);
    const stackedData = stack(dataForStack);
    
    // form chart
    const svg = d3.select("#chart svg"); 
    const margin = { top: 20, right: 100, bottom: 60, left: 300 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    const g = svg.select("g");
    const color = d3.scaleOrdinal()
        .domain(['United States', 'Mexico', 'Canada'])
        .range(['steelblue', 'green', 'red']);
    
    // make scales
    const x = d3.scaleLinear()
        .domain([0, sortBy === 'weeks' ? d3.max(topArtists, d => d.weeksOnChart) : d3.max(topArtists, d => d.total)])
        .range([0, width]);
    const y = d3.scaleBand()
        .domain(topArtists.map(d => d.artist))
        .range([0, height])
        .padding(0.1); 
    
    // put on the STACKED bars 💪
    g.selectAll(".stack")
        .data(stackedData)
        .enter().append("g")
        .attr("class", "stack")
        .attr("fill", d => color(d.key))
        .selectAll("rect")
        .data(d => d)
        .enter().append("rect")
        .attr("x", d => x(d[0]))
        .attr("y", d => y(d.data.artist))
        .attr("width", d => x(d[1]) - x(d[0]))
        .attr("height", y.bandwidth())
        .attr("opacity", 0.8)
        .style("cursor", "pointer") 
        .on("mouseover", function(event, d) {
            //tooltip
            const countryValue = d[1] - d[0];
            const country = d3.select(this.parentNode).datum().key;
            let tooltip = d3.select("body").select(".tooltip");
            if (tooltip.empty()) {
                tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("opacity", 0)
                    .style("position", "absolute")
                    .style("background-color", "black")
                    .style("color", "white")
                    .style("padding", "10px")
                    .style("border-radius", "5px")
                    .style("font-size", "12px")
                    .style("pointer-events", "none") 
                    .style("z-index", "1000");
            }
            tooltip.transition().duration(200).style("opacity", .9);
            
            // figure out sort
            if (sortBy === 'weeks') {
                tooltip.html(`
                    <strong>${d.data.artist}</strong><br/>
                    Country: ${country}<br/>
                    Weeks on Chart: ${countryValue}<br/>
                    Total Weeks: ${d.data.weeksOnChart}<br/>
                    Total Streams: ${d.data.total.toLocaleString()} 
                `);
            } else {
                tooltip.html(`
                    <strong>${d.data.artist}</strong><br/>
                    Country: ${country}<br/>
                    Streams: ${countryValue.toLocaleString()}<br/>
                    Total Streams: ${d.data.total.toLocaleString()}<br/>
                    Weeks on Chart: ${d.data.weeksOnChart} 
                `);
            }
            
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select("body").select(".tooltip")
                .transition() 
                .duration(500)
                .style("opacity", 0);
        });
    
    // add artist labels
    g.selectAll(".artist-label")
        .data(topArtists)
        .enter().append("text")
        .attr("class", "artist-label")
        .attr("x", -5)
        .attr("y", d => y(d.artist) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", "end")
        .style("font-size", "12px")
        .text(d => d.artist); 
    
    // axes and legend
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(d => sortBy === 'weeks' ? d : (d / 1000000).toFixed(0) + "M"));
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .text(sortBy === 'weeks' ? 'Weeks on Chart' : 'Total Streams (Millions)'); 
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${width + 20}, 20)`);
    const legendItems = legend.selectAll(".legend-item")
        .data(stackKeys)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${i * 25})`);
    legendItems.append("rect")
        .attr("width", 18)
        .attr("height", 18)
        .attr("fill", d => color(d))
        .attr("opacity", 0.8); 

    legendItems.append("text")
        .attr("x", 25)
        .attr("y", 9)
        .attr("dy", "0.35em")
        .style("font-size", "12px") 
        .text(d => d);
}

// add song visualization
function createSongVisualization() {
    if (!chartData || chartData.length === 0) return;
    
    // get countries selected
    const selectedRegions = [];
    const regionMappings = {
        us: ['United States', 'US', 'us'],
        mx: ['Mexico', 'MX', 'mx'], 
        ca: ['Canada', 'CA', 'ca']
    };
    if (document.getElementById('us-checkbox').checked) {
        selectedRegions.push(...regionMappings.us);
    }
    if (document.getElementById('mx-checkbox').checked) {
        selectedRegions.push(...regionMappings.mx);
    }
    if (document.getElementById('ca-checkbox').checked) {
        selectedRegions.push(...regionMappings.ca); 
    }
    
    // default to all countries if nothing is selected
    const dataToUse = selectedRegions.length === 0 ? chartData : chartData.filter(d => selectedRegions.includes(d.region));
    
    // aggregate data by song
    const songData = {};
    dataToUse.forEach(d => {
        const songKey = `${d.title} - ${d.artist}`;
        if (!songData[songKey]) {
            songData[songKey] = {
                title: d.title,
                artist: d.artist,
                totalStreams: 0,
                chartAppearances: 0,
                bestRank: Infinity,
                countries: new Set()
            };
        }
        
        songData[songKey].totalStreams += d.streams;
        songData[songKey].chartAppearances += 1;
        songData[songKey].bestRank = Math.min(songData[songKey].bestRank, d.rank); 
        
        let country = d.region;
        if (regionMappings.us.includes(d.region)) country = 'United States';
        else if (regionMappings.mx.includes(d.region)) country = 'Mexico'; 
        else if (regionMappings.ca.includes(d.region)) country = 'Canada';
        songData[songKey].countries.add(country);
    });
    
    // see waht song slider is set to
    const songCount = document.getElementById('song-count-slider') ? parseInt(document.getElementById('song-count-slider').value) : 50;
    
    //  sort by total streams
    const topSongs = Object.values(songData)
        .map(d => ({
            ...d,
            countries: Array.from(d.countries)
        }))
        .sort((a, b) => b.totalStreams - a.totalStreams)
        .slice(0, songCount);
    
    // scatter plot
    const svg = d3.select("#chart svg");
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    
    const g = svg.select("g");
    
    // make scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(topSongs, d => d.chartAppearances)]) 
        .range([0, width]); 
    
    const y = d3.scaleLinear()
        .domain([0, d3.max(topSongs, d => d.totalStreams)])
        .range([height, 0]);
    
    const radius = d3.scaleSqrt()
        .domain([1, d3.max(topSongs, d => d.bestRank)])
        .range([8, 3]);
    
    // Create 
    let tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "black")
            .style("color", "white")
            .style("padding", "10px")
            .style("border-radius", "5px") 
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");
    }
    
    // pour on the circles (by post malone)
    g.selectAll(".song-circle")
        .data(topSongs)
        .enter().append("circle")
        .attr("class", "song-circle")
        .attr("cx", d => x(d.chartAppearances))
        .attr("cy", d => y(d.totalStreams))
        .attr("r", d => radius(d.bestRank))
        .attr("fill", d => {
            // color by number of countries
            if (d.countries.length === 3) return "#FF6B6B";
            if (d.countries.length === 2) return "#4ECDC4"; 
            return "#DA70D6";
        })
        .attr("opacity", 0.7)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            // tooltipper
            tooltip.transition()
                .duration(200) 
                .style("opacity", .9);
            tooltip.html(`
                <strong>${d.title}</strong><br/>
                Artist: ${d.artist}<br/>
                Total Streams: ${d.totalStreams.toLocaleString()}<br/>
                Chart Appearances: ${d.chartAppearances}<br/>
                Best Rank: #${d.bestRank}<br/>
                Countries: ${d.countries.join(', ')}
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });
    
    /// axes
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));
    
    g.append("g")
        .attr("class", "axis") 
        .call(d3.axisLeft(y).tickFormat(d => (d / 1000000).toFixed(0) + "M"));
    

    g.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .text("Chart Appearances");
    
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Total Streams (Millions)");
//legend
    const legend = g.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(20, 20)`);
    
    legend.append("text")
        .attr("x", 0)
        .attr("y", 0)
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .text("Countries Charted");
    
    legend.append("text")
        .attr("x", 0)
        .attr("y", 18)
        .style("font-size", "11px")
        .style("font-style", "italic")
        .style("fill", "#666")
        .text("(Bubble size = best rank)");
    
    const legendData = [
        { color: "#FF6B6B", text: "All 3 countries", countries: 3 },
        { color: "#4ECDC4", text: "2 countries", countries: 2 },
        { color: "#DA70D6", text: "1 country", countries: 1 }
    ];
    
    const legendItems = legend.selectAll(".legend-item")
        .data(legendData)
        .enter().append("g")
        .attr("class", "legend-item")
        .attr("transform", (d, i) => `translate(0, ${(i + 1) * 25 + 18})`); // Added offset for bubble size text
    
    legendItems.append("circle")
        .attr("cx", 8)
        .attr("cy", 0)
        .attr("r", 6)
        .attr("fill", d => d.color)
        .attr("opacity", 0.7)
        .attr("stroke", "white")
        .attr("stroke-width", 1);
    
    legendItems.append("text")
        .attr("x", 20)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .style("font-size", "12px")
        .text(d => d.text);
}

// create chart once a checkbox is checked
let chartData = [];
let dateObjects = [];
let dateSlider, topSongsSlider;

// make chart with data
function createChart(data) {
    chartData = data;
    
    // get unique dates from data
    const uniqueDates = [...new Set(data.map(d => d.date.getTime()))].sort();
    dateObjects = uniqueDates.map(time => new Date(time));
    
    // get slider
    dateSlider = document.getElementById('date-slider');
    topSongsSlider = document.getElementById('top-songs-slider');
    
    // make SVG if it doesn't exist
    let svg = d3.select("#chart").select("svg");
    if (svg.empty()) {
        svg = d3.select("#chart").append("svg")
            .attr("width", 1000)
            .attr("height", 600);
    }
    
    // remove stuff
    svg.on("click", function(event) {
        d3.selectAll(".bubble").classed("pinned", false);
        d3.selectAll(".pinned-tooltip").remove();
        d3.selectAll(".bubble")
            .attr("stroke-width", 1)
            .attr("fill-opacity", 0.7)
            .attr("stroke", "white");
    });
    //margins
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;

    const x = d3.scaleBand()
        .range([0, width])
        .padding(0.1);
    const y = d3.scaleLinear()
        .range([height, 0]);

    let g = svg.select("g");
    if (g.empty()) {
        g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    }

    // chart update
    updateChart();
}

// function to update chart based on current slider values and checkbox selections
function updateChart() {
    if (!chartData || chartData.length === 0) return;
    
    // get params
    const currentDateIndex = parseInt(dateSlider.value);
    const currentTopSongs = parseInt(topSongsSlider.value);
    const selectedDate = dateObjects[currentDateIndex];
    const selectedRegions = [];
    if (document.getElementById('us-checkbox').checked) {
        selectedRegions.push('United States', 'US', 'us');
    }
    if (document.getElementById('mx-checkbox').checked) {
        selectedRegions.push('Mexico', 'MX', 'mx');
    }
    if (document.getElementById('ca-checkbox').checked) {
        selectedRegions.push('Canada', 'CA', 'ca');
    }
    
    // filter data by selected date 
    const dateFilteredData = chartData.filter(d => d.date.getTime() === selectedDate.getTime());
    if (dateFilteredData.length > 0) {
    }
    
    // Get top songs
    let topSongs = [];
    const regionMappings = {
        us: ['United States', 'US', 'us'],
        mx: ['Mexico', 'MX', 'mx'], 
        ca: ['Canada', 'CA', 'ca']
    };
    if (document.getElementById('us-checkbox').checked) {
        const usData = dateFilteredData
            .filter(d => regionMappings.us.includes(d.region))
            .sort((a, b) => a.rank - b.rank)
            .slice(0, currentTopSongs);
        topSongs = topSongs.concat(usData);
    }
    
    if (document.getElementById('mx-checkbox').checked) {
        const mxData = dateFilteredData
            .filter(d => regionMappings.mx.includes(d.region))
            .sort((a, b) => a.rank - b.rank)
            .slice(0, currentTopSongs);
        topSongs = topSongs.concat(mxData);
    }
    
    if (document.getElementById('ca-checkbox').checked) {
        const caData = dateFilteredData
            .filter(d => regionMappings.ca.includes(d.region))
            .sort((a, b) => a.rank - b.rank)
            .slice(0, currentTopSongs);
        topSongs = topSongs.concat(caData);
    }
    
    // write title and update chart
    updateChartTitle(currentTopSongs, selectedDate);
    updateChartVisual(topSongs);
}

// function to update the dynamic chart title
function updateChartTitle(topSongs, selectedDate) {
    // Get selected country
    const selectedCountries = [];
    if (document.getElementById('us-checkbox').checked) {
        selectedCountries.push('United States');
    }
    if (document.getElementById('mx-checkbox').checked) {
        selectedCountries.push('Mexico');
    }
    if (document.getElementById('ca-checkbox').checked) {
        selectedCountries.push('Canada');
    }
    
        // format the country list with color coding
    let countryText = '';
    if (selectedCountries.length === 0) {
        countryText = 'no countries selected';
    } else {
        // create colored country names
        const coloredCountries = selectedCountries.map(country => {
            let color = '';
            if (country === 'United States') color = 'steelblue';
            else if (country === 'Mexico') color = 'green';
            else if (country === 'Canada') color = 'red';
            return `<span style="color: ${color}; font-weight: bold;">${country}</span>`;
        });
        
        if (selectedCountries.length === 1) {
            countryText = coloredCountries[0]; 
        } else if (selectedCountries.length === 2) {
            countryText = coloredCountries.join(' and ');
        } else {
            countryText = coloredCountries.slice(0, -1).join(', ') + ', and ' + coloredCountries[coloredCountries.length - 1];
        }
    }
    

    // write the date
    const dateText = selectedDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
    
    // write the title
    const titleElement = document.getElementById('chart-title');
    if (selectedCountries.length === 0) {
        titleElement.textContent = 'Select countries and adjust settings to view chart';
    } else {
        titleElement.innerHTML = `Top ${topSongs} songs for ${countryText} on ${dateText}`;
    }
}

// big boy function to update the chart
function updateChartVisual(data) {
    // set the variables we need for the chart
    const svg = d3.select("#chart svg");
    const margin = { top: 20, right: 30, bottom: 60, left: 80 };
    const width = +svg.attr("width") - margin.left - margin.right;
    const height = +svg.attr("height") - margin.top - margin.bottom;
    const x = d3.scaleLinear()
        .domain([d3.max(data, d => d.rank), 1])
        .range([0, width]);
    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.streams)])
        .range([height, 0]);
    const radius = d3.scaleSqrt()
        .domain([0, d3.max(data, d => d.streams)])
        .range([3, 15]);
    const g = svg.select("g");
    
    if (data.length === 0) {
        g.selectAll("*").remove();
        return;
    }
    
    // delete old stff
    g.selectAll(".bubble").remove();
    g.selectAll(".axis").remove();
    g.selectAll(".axis-label").remove();
    d3.selectAll(".pinned-tooltip").remove();

    // add tolltip
    let tooltip = d3.select("body").select(".tooltip");
    if (tooltip.empty()) {
        tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("opacity", 0)
            .style("position", "absolute")
            .style("background-color", "black")
            .style("color", "white")
            .style("padding", "10px")
            .style("border-radius", "5px")
            .style("font-size", "12px")
            .style("pointer-events", "none")
            .style("z-index", "1000");
    }
    
    // place bubbles on graph
    g.selectAll(".bubble")
        .data(data)
        .enter().append("circle")
        .attr("class", "bubble")
        .attr("cx", d => x(d.rank))
        .attr("cy", d => y(d.streams))
        .attr("r", d => radius(d.streams))
        .attr("fill", d => {
            if (d.region === 'United States' || d.region === 'US' || d.region === 'us') {
                return "steelblue";
            } else if (d.region === 'Mexico' || d.region === 'MX' || d.region === 'mx') {
                return "green";
            } else if (d.region === 'Canada' || d.region === 'CA' || d.region === 'ca') {
                return "red";
            } else {
                return "gray"; 
            }
        })
        .attr("fill-opacity", 0.7)
        .attr("stroke", "white")
        .attr("stroke-width", 1)
        .style("cursor", "pointer")
        // use mouseover for tooltip
        .on("mouseover", function(event, d) {
            // dont do hover effects if song is pinned
            if (d3.select(this).classed("pinned")) return;
            
            // add country
            let countryName = d.region;
            if (d.region === 'US' || d.region === 'us') countryName = 'United States';
            if (d.region === 'MX' || d.region === 'mx') countryName = 'Mexico';
            if (d.region === 'CA' || d.region === 'ca') countryName = 'Canada';
            
            // show tooltip
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(`
                <strong>${d.title}</strong><br/>
                Artist: ${d.artist}<br/>
                Rank: #${d.rank}<br/>
                Streams: ${d.streams.toLocaleString()}<br/>
                Country: ${countryName}<br/>
                <small><em>Click to pin</em></small>
            `)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px"); 
            
            // highlight bubbles for same song
            g.selectAll(".bubble")
                .filter(function(bubbleData) {
                    return bubbleData.title === d.title && bubbleData.artist === d.artist && !d3.select(this).classed("pinned");
                })
                .attr("stroke-width", 3)
                .attr("fill-opacity", 1)
                .attr("stroke", "#FFD700");
        })
        .on("mouseout", function(event, d) {
            // tooltip be gone
            tooltip.transition()
                .duration(500)
                .style("opacity", 0); 
            g.selectAll(".bubble")
                .filter(function(bubbleData) {
                    return bubbleData.title === d.title && bubbleData.artist === d.artist && !d3.select(this).classed("pinned");
                })
                .attr("stroke-width", 1)
                .attr("fill-opacity", 0.7)
                .attr("stroke", "white");
        })
        .on("click", function(event, d) {
            event.stopPropagation();
            
            const isCurrentlyPinned = d3.select(this).classed("pinned");
            if (isCurrentlyPinned) {
                // unpin
                g.selectAll(".bubble")
                    .filter(function(bubbleData) {
                        return bubbleData.title === d.title && bubbleData.artist === d.artist;
                    })
                    .classed("pinned", false)
                    .attr("stroke-width", 1)
                    .attr("fill-opacity", 0.7)
                    .attr("stroke", "white");
                d3.selectAll(`.pinned-tooltip-${d.title.replace(/[^a-zA-Z0-9]/g, '')}`).remove();
            } else {
                // otherwise pin
                g.selectAll(".bubble")
                    .filter(function(bubbleData) {
                        return bubbleData.title === d.title && bubbleData.artist === d.artist;
                    })
                    .classed("pinned", true)
                    .attr("stroke-width", 4)
                    .attr("fill-opacity", 1)
                    .attr("stroke", "#00d5ffff");
                const countryName = d.region === 'US' || d.region === 'us' ? 'United States' :
                                  d.region === 'MX' || d.region === 'mx' ? 'Mexico' :
                                  d.region === 'CA' || d.region === 'ca' ? 'Canada' : d.region;
                const pinnedTooltip = d3.select("body").append("div")
                    .attr("class", `pinned-tooltip pinned-tooltip-${d.title.replace(/[^a-zA-Z0-9]/g, '')}`)
                    .style("position", "absolute")
                    .style("background-color", "#333")
                    .style("color", "white")
                    .style("padding", "10px")
                    .style("border-radius", "5px")
                    .style("font-size", "12px")
                    .style("border", "2px solid #FF4500")
                    .style("z-index", "1001")
                    .style("opacity", 0); 
                
                pinnedTooltip.html(`
                    <strong>${d.title}</strong><br/>
                    Artist: ${d.artist}<br/>
                    Rank: #${d.rank}<br/>
                    Streams: ${d.streams.toLocaleString()}<br/>
                    Country: ${countryName}<br/>
                    <small><em>Pinned - Click again to unpin</em></small>
                `)
                    .style("left", (event.pageX + 15) + "px")
                    .style("top", (event.pageY + 15) + "px")
                    .transition()
                    .duration(300)
                    .style("opacity", 1);
            }
        });
    
    // Add axes
    g.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x).tickFormat(""));
    g.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(y)); 
    g.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 50)
        .attr("text-anchor", "middle")
        .text("Songs");
    
    g.append("text")
        .attr("class", "axis-label")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Streams");
}