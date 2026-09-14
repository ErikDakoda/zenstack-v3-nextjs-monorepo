import { RPCApiHandler } from '@zenstackhq/server/api';
import { schema } from '../zenstack/schema';

export { NextRequestHandler } from '@zenstackhq/server/next';

export const rpcApiHandler = new RPCApiHandler({ schema });
