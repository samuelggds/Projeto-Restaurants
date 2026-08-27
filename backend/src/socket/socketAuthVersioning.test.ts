// @ts-nocheck
import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';
import jwt from 'jsonwebtoken';

import prisma from '../config/prisma.js';
import authTokenService from '../modules/auth/services/AuthTokenService.js';
import { socketAuth } from './socketAuth.js';

const originalFindUnique = prisma.user.findUnique;
const originalJwtSecret = process.env.JWT_SECRET;
const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  prisma.user.findUnique = originalFindUnique;
  process.env.JWT_SECRET = originalJwtSecret;
  process.env.NODE_ENV = originalNodeEnv;
});

function socketWithToken(token) {
  return { handshake: { auth: { token } } };
}

async function authenticate(socket) {
  let receivedError;
  await socketAuth(socket, (error) => {
    receivedError = error;
  });
  return receivedError;
}

test('handshake versionado usa role e tenant atuais do banco', async () => {
  process.env.JWT_SECRET = 'socket-versioning-secret-with-32-characters';
  process.env.NODE_ENV = 'production';
  prisma.user.findUnique = async () => ({
    id: 44,
    active: true,
    role: 'FUNCIONARIO',
    subRole: 'GARCOM',
    restaurantId: 8,
    email: 'waiter@example.test',
    authVersion: 6,
  });
  const token = authTokenService.createAccessToken({
    id: 44,
    role: 'ADMIN',
    restaurantId: 99,
    authVersion: 6,
  });
  const socket = socketWithToken(token);

  const error = await authenticate(socket);

  assert.equal(error, undefined);
  assert.equal(socket.user.role, 'FUNCIONARIO');
  assert.equal(socket.user.subRole, 'GARCOM');
  assert.equal(socket.user.restaurantId, 8);
});

test('handshake rejeita conta inativa ou authVersion revogada', async () => {
  process.env.JWT_SECRET = 'socket-versioning-secret-with-32-characters';
  process.env.NODE_ENV = 'production';
  prisma.user.findUnique = async () => ({
    id: 44,
    active: false,
    role: 'ADMIN',
    subRole: null,
    restaurantId: 8,
    email: 'admin@example.test',
    authVersion: 7,
  });
  const token = authTokenService.createAccessToken({
    id: 44,
    role: 'ADMIN',
    restaurantId: 8,
    authVersion: 6,
  });

  assert.match(String((await authenticate(socketWithToken(token)))?.message), /Token inválido/);
});

test('handshake nunca aceita refresh token como access token', async () => {
  process.env.JWT_SECRET = 'socket-versioning-secret-with-32-characters';
  process.env.NODE_ENV = 'production';
  const refreshToken = jwt.sign(
    { id: 44, role: 'ADMIN', restaurantId: 8, authVersion: 6, type: 'refresh', jti: 'x' },
    process.env.JWT_SECRET,
  );

  assert.match(
    String((await authenticate(socketWithToken(refreshToken)))?.message),
    /Token inválido/,
  );
});
