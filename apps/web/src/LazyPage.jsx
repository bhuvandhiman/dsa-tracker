import {Component,lazy,Suspense} from 'react';
import ErrorBoundary from './ErrorBoundary.jsx';

export default class LazyPage extends Component {
  constructor(props){
    super(props);
    this.state={Page:lazy(props.load),attempt:0};
  }

  // Recreate only on an explicit retry, never during render.
  retry=()=>this.setState(value=>({Page:lazy(this.props.load),attempt:value.attempt+1}));

  render(){
    const {Page,attempt}=this.state,{load:Load,name,...props}=this.props;
    return <ErrorBoundary key={attempt} name={name} onRetry={this.retry}>
      <Suspense fallback={<p className="account-loading" role="status">Opening {name}…</p>}><Page {...props} /></Suspense>
    </ErrorBoundary>;
  }
}
