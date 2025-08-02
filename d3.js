async function init() {
    try {
        // load csv
        const data = await d3.csv("charts.csv");
        
        // sanity check data
        console.log("Successfully loaded CSV");
        console.log("Total rows:", data.length);
        console.log("Columns:", data.columns);
        console.log("First 5 rows:", data.slice(0, 5));
        
        // convert rank and stream to numbers and convert date to date object
        data.forEach(d => {
            d.rank = +d.rank;
            d.streams = +d.streams;
            d.date = new Date(d.date);
        });
        
        return data;
    } catch (error) {
        console.error("Error loading CSV:", error);
        throw error;
    }
}
