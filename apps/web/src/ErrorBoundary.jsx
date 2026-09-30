import { Component } from 'react';
import { Alert, Box, Button } from '@mui/material';
export default class ErrorBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed ? <Box sx={{p:3}}><Alert severity="error" action={<Button onClick={()=>window.location.reload()}>Reload</Button>}>This view could not be displayed. Your saved practice is safe. Reload to recover.</Alert></Box> : this.props.children;}
}
