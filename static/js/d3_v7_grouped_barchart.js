// set the dimensions and margins of the graph
const margin3 = {top: 20, right: 10, bottom: 100, left: 30},
    width3 = 450 - margin.left - margin.right,
    height3 = 550 - margin.top - margin.bottom;

const margin4 = {top: 20, right: 10, bottom: 100, left: 30},
    width4 = 450 - margin.left - margin.right,
    height4 = 550 - margin.top - margin.bottom;    

// append the svg for the graph
const svgGrouped = d3.select("#grouped_barchart_v7")
    .append("svg")
        .attr("width", width3 + margin3.left + margin3.right)
        .attr("height", height3 + margin3.top + margin3.bottom)
        .attr("viewBox", "0 0 450 550")
    .append("g")
        .attr("transform", `translate(${margin3.left},${margin3.top})`);

// append the svg for the legend
const svgLegendGrouped = d3.select("#chart_legend_grouped")
  .append("svg")
      .attr("width", width4 + margin4.left + margin4.right)
       .attr("height", height4 + margin4.top + margin4.bottom)
       .attr("viewBox", "0 0 450 550")
  .append("g")
       .attr("transform", `translate(${margin4.left},${margin4.top})`);    

const dataCsv = $('#grouped_barchart_v7').attr('data');  

const legendGrouped = $('#chart_legend_grouped').attr('data');  

async function createGroupedBars() {
    const csvData = await d3.csvParse(dataCsv); 

    const sumbyYearProduct = d3.rollups(csvData, v => d3.sum(v, d => +d.amount), d => d.year, d => d.product)
    const yearKeys = Array.from(sumbyYearProduct).map(d => d[0])
    const productKeys = Array.from(Array.from(sumbyYearProduct)[0][1]).map(d=>d[0])
    const productKeys_sorted = productKeys.sort(d3.ascending)

// X scale and Axis
const x = d3.scaleBand()
  .domain(yearKeys)
  .range([0, width3])
  .padding(.2);
const xAxis = svgGrouped
  .append('g')
  .attr("transform", `translate(0,${height3})`)
  .call(d3.axisBottom(x)
  .tickSize(0));

// X axis labels 
xAxis.selectAll('text')
    .attr('transform', 'translate(-10, 0) rotate(-55)')
    .style("font", "14px arial")
    .style('text-anchor', 'end');  

// Y scale and Axis
const formater =  d3.format(".1s")

const y = d3.scaleLinear()
    .domain([0, d3.max(csvData.map(d => +d.amount))])
    .range([height3, 0]);
svgGrouped
  .append('g')
  .call(d3.axisLeft(y).ticks(5).tickSize(0).tickPadding(6).tickFormat(formater))
  .call(d => d.select(".domain").remove());

// set subgroup scale
const xSubgroups = d3.scaleBand()
  .domain(productKeys_sorted)
  .range([0, x.bandwidth()])
  .padding([0.05])

// color palette
const color = d3.scaleOrdinal()
  .domain(productKeys_sorted)
  .range(['#54e37a', '#0ea181', '#bf11ae', '#280b9c','#1f915e', '#99223a', '#4a113f', '#997c93', '#0c2e2d', '#24ede7', '#22f24c', 
          '#f72302', '#e6e61e', '#04144a', '#798bc7', '#c753d4', '#691625', '#aff57a', '#1dced1', '#191391', '#6e68de', '#326b22', 
          '#d43808', '#540c78', '#3d2747', '#fcf19a', '#db6435', '#d07ff0', '#64546b', '#42695f'])

// set horizontal grid line
const GridLine = () => d3.axisLeft().scale(y);

svgGrouped
  .append("g")
    .attr("class", "grid")
  .call(GridLine()
    .tickSize(-width3,0,0)
    .tickFormat("")
);

// create a tooltip
const tooltip = d3.select("#grouped_barchart_v7")
  .append("div")
    .attr("id", "chart")
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "5px");

// tooltip events
const mouseover = function(event, d) {
    tooltip
        .style("opacity", 1)
        .data(productKeys_sorted)
      .html("<b>" + "Product: " + "</b>" + d[0] + "<hr>" + "<b>" + "Value: " + "</b>" + d[1] )
    d3.select(this)
      .style("opacity", .5)
      
      
}
const mousemove = function(event, d) {
    tooltip.style("transform","translateY(-250%)")
      .style("top", event.pageY - 10 + "px")
      .style("left", event.pageX + 10 + "px");
}
const mouseleave = function(d) {
    tooltip
      .style("opacity", 0)
    d3.select(this)
      .style("opacity", 1)
}

// create bars
bars = svgGrouped.append("g")
  .selectAll("g")
  .data(sumbyYearProduct)
  .join("g")
     .attr("transform", d => "translate(" + x(d[0]) +", 0)")
  .selectAll("rect")
  .data(d => { return d[1] })
  .join("rect")
     .attr("x", d => xSubgroups(d[0]))
     .attr("y", d => y(d[1]))
     .attr("width", xSubgroups.bandwidth())
     .attr("height", d => height3 - y(d[1]))
     .attr("fill", d=>color(d[0]))
  .on("mouseover", mouseover)
  .on("mousemove", mousemove)
  .on("mouseleave", mouseleave);

// Add one dot in the legend for each name.
svgLegendGrouped.selectAll("colors")
  .data(productKeys)
  .enter()
  .append("circle")
    .attr("cx", 20)
    .attr("cy", function(d,i){ return 8 + i*22}) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("r", 8)
    .style("fill", function(d){ return color(d)})

// Add one dot in the legend for each name.
svgLegendGrouped.selectAll("labels")
  .data(productKeys)
  .enter()
  .append("text")
    .attr("x", 40)
    .attr("y", function(d,i){ return 8 + i*22}) // 100 is where the first dot appears. 25 is the distance between dots
    .text(function(d){ return d})
    .attr("text-anchor", "left")
    .style('fill', 'black')
    .style("font", "11px arial")

}

createGroupedBars();
