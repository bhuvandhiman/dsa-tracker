import {Component} from 'react';

export default class ErrorBoundary extends Component {
  state={failed:false};

  static getDerivedStateFromError(){return {failed:true};}

  componentDidUpdate(previous){
    if(this.state.failed&&previous.resetKey!==this.props.resetKey)this.setState({failed:false});
  }

  retry=()=>{
    if(this.props.reloadOnly){window.location.reload();return;}
    this.props.onRetry?.();
    this.setState({failed:false});
  };

  render(){
    if(!this.state.failed)return this.props.children;
    return <section className="dashboard-message error-message page-recovery" role="alert">
      <h1>Could not open {this.props.name||'this page'}.</h1>
      <p>Try again. If this keeps happening, reload Recall to get the latest version.</p>
      <div className="row-actions"><button type="button" className="secondary-button" onClick={this.retry}>{this.props.reloadOnly?'Reload Recall':'Try again'}</button>{!this.props.reloadOnly&&<button type="button" className="text-button inline-link" onClick={()=>window.location.reload()}>Reload Recall</button>}<a className="inline-link" href="#/home">Home</a></div>
    </section>;
  }
}
