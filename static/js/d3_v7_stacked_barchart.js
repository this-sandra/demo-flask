// set the dimensions and margins of the graph
const margin = {top: 20, right: 10, bottom: 100, left: 50},
    width = 450 - margin.left - margin.right,
    height = 550 - margin.top - margin.bottom;

// set the dimensions and margins of the legend
const margin2 = {top: 0, right: 0, bottom: 100, left: 0},
    width2 = 450 - margin.left - margin.right,
    height2 = 550 - margin.top - margin.bottom;    

// append the svg for the graph
const svgChart = d3.select("#stacked_barchart_v7")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .attr("viewBox", "0 0 550 450")
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// append the svg for the legend
const svgLegend = d3.select("#chart_legend")
  .append("svg")
    .attr("width", width2 + margin2.left + margin2.right)
    .attr("height", height2 + margin2.top + margin2.bottom)
    .attr("viewBox", "0 0 550 450")
  .append("g")
    .attr("transform", `translate(${margin2.left},${margin2.top})`);    

const x = d3.scaleBand();
const y = d3.scaleLinear();

const src = $('#stacked_barchart_v7').attr('data');

const legend = $('#chart_legend').attr('data');

const colors = d3.scaleOrdinal(['#54e37a', '#0ea181', '#bf11ae', '#280b9c','#1f915e', '#99223a', '#4a113f', '#997c93', 
                                '#0c2e2d', '#24ede7', '#22f24c', '#f72302', '#e6e61e', '#04144a', '#798bc7', '#c753d4', 
                                '#691625', '#aff57a', '#1dced1', '#191391', '#6e68de', '#326b22', '#d43808', '#540c78', 
                                '#3d2747', '#fcf19a', '#db6435', '#d07ff0', '#64546b', '#42695f']);
let barGroup;

const group = svgChart.append('g')
    .attr('transform', `translate(${margin.left}, 0)`);

async function createStackedBars() {
  const data = await d3.csvParse(src); 
  const stack = d3.stack().keys(data.columns.slice(1))(data);
  const subgroups = data.columns.slice(1);


  // Create a tooltip
  const tooltip = d3.select("#stacked_barchart_v7")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "1px")
    .style("border-radius", "5px")
    .style("padding", "5px")
    

  // Three functions that change the tooltip when user hover / move / leave a cell
  const mouseover = function(event, d) {
    const subgroupName = d3.select(this.parentNode).datum().key;
    const subgroupValue = d.data[subgroupName];
    tooltip
        .html("<b>" + "Product: " + "</b>" + subgroupName + "<hr>" + "<b>" + "Value: " + "</b>" + subgroupValue )
        .style("opacity", 1)
  }
  const mousemove = function(event, d) {
    tooltip.style("transform","translateY(-250%)")
           .style("left",(event.x)/2+"px")
           .style("top",(event.y)/2-30+"px")
  }
  const mouseleave = function(event, d) {
    tooltip
      .style("opacity", 0)
  }

  // Scales
  x.domain(data.map(d => { 
      return d.schiffsart; 
    }))
    .range([0, width])
    .padding(0.1)
  
  y.domain([0, d3.max(stack, d => d3.max(d, (d) => d[1] + margin.top))])
   .range([height, 0]);
  
  // Y Axis
  group.append('g')
    .attr('class', 'y-axis')
    .call(
      d3.axisLeft(y)
        .tickSize(-width)
     );

  d3.selectAll('.y-axis text')
    .attr('x', -10)
    .style("font", "12px arial")

  
  // X Axis
  const xAxis = group.append('g')
    .attr('class', 'x-axis')
    .attr('transform', `translate(0, ${height})`)
    .call(
      d3.axisBottom(x)
        .tickSizeOuter(0)
    );
  
  // X axis labels 
  xAxis.selectAll('text')
      .attr('transform', 'translate(-10, 0) rotate(-45)')
      .style("font", "16px arial")
      .style('text-anchor', 'end');
  
  barGroup = group.selectAll('.bar-group')
    .data(stack)
    .enter()
    .append('g')
    .attr('class', 'bar-group')
    .attr('fill', d => {
      return colors(d.key);
    });
  
  // Stacked bars
  bars = barGroup.selectAll('.rect')
    .data(stack)
    .data(d => {
      return d;
    })
    .enter()
    .append('rect')
    .attr('class', 'rect')
    .attr('x', d => {
      return x(d.data.schiffsart);
    })
    .attr('y', height)
    .attr('height', 0)
    .attr('width', x.bandwidth())
    .attr('aria-label', d => {
      return `${d.data.schiffsart} bar`;
    })
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);

  // Bar transitions
  bars.transition()
    .delay(200)
    .duration(500)
    .ease(d3.easeLinear)
    .attr('height', d => {
      return y(d[0]) - y(d[1]);
    })
    .attr('y', d => {
      return y(d[1]);
    });
  
// Add one dot in the legend for each name.
svgLegend.selectAll("colors")
  .data(subgroups)
  .data(stack)
  .enter()
  .append("circle")
    .attr("cx", 20)
    .attr("cy", function(d,i){ return 10 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
    .attr("r", 10)
    .style("fill", function(d){ return colors(d.key)})

// Add one dot in the legend for each name.
svgLegend.selectAll("labels")
  .data(subgroups)
  .enter()
  .append("text")
    .attr("x", 40)
    .attr("y", function(d,i){ return 10 + i*25}) // 100 is where the first dot appears. 25 is the distance between dots
    .text(function(d){ return d})
    .attr("text-anchor", "left")
    .style('fill', 'black')
    .style("font", "16px arial")

}

createStackedBars();





