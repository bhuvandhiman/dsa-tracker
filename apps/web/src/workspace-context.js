import {createContext,useCallback,useContext} from 'react';
import {request} from './api.js';

export const WorkspaceContext=createContext(null);
// Bind asynchronous forms/retries to the account that rendered them. Reading
// the latest SDK token alone could otherwise send old choices to a new owner.
export function useWorkspaceRequest(){
  const scope=useContext(WorkspaceContext);
  return useCallback((path,options={})=>request(path,{...options,workspaceScope:scope}),[scope]);
}
