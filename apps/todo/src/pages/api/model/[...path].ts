import { NextRequestHandler, rpcApiHandler } from '@erikdakoda/database/server/zenstackServerNext';
import { getEnhancedDb } from '@erikdakoda/database/server/getEnhancedDb';

export default NextRequestHandler({
  apiHandler: rpcApiHandler,
  getClient: (req, res) => getEnhancedDb({ req, res }),
});
