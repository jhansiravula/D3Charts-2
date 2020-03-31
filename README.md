# D3 Charts

This repository serves as a submodule for the visualizations and animations on [https://pmplewa.github.io](https://pmplewa.github.io).

A single chart can be rendered like this, for example:

```js
<ChartComponent chart={/* chart */}/>
```

```js
class ChartComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {show: false};
    this.handleClick = this.handleClick.bind(this);
  }
  componentDidUpdate() {
    var el = ReactDOM.findDOMNode(this.refs.window);
    if (this.state.show) {
      this.props.chart.create(el);
    } else {
      this.props.chart.destroy();
    }
    MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
  }
  componentWillUnmount() {
    this.props.chart.destroy();
  }
  handleClick() {
    this.setState({show: !this.state.show});
  }
  render() {
    if (!this.state.show) {
      return (
        <div>
          <button onClick={this.handleClick}>show chart</button>
        </div>
      );
    } else {
      return (
        <div>
          <button onClick={this.handleClick}>hide chart</button>
          <div ref="window" className={this.props.chart.id} style={{maxWidth: 960, margin: "0 auto"}}></div>
          {this.props.chart.controls()}
          {/* render chart.name, chart.readme, chart.sources, ... */}
        </div>
      );
    }
  }
}
```
