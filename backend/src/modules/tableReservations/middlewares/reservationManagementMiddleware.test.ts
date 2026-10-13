import assert from 'node:assert/strict';
import test from 'node:test';
import { FuncionarioSubRole, UserRole } from '@prisma/client';
import type { Request, Response, NextFunction } from 'express';
import { reservationManagementMiddleware } from './reservationManagementMiddleware.js';

function authorize(user: unknown) {
  let status = 200;
  let next = false;
  const req = { user } as Request;
  const res = {
    status(value: number) { status = value; return this; },
    json() { return this; },
  } as unknown as Response;
  reservationManagementMiddleware(req,res,(() => { next = true; }) as NextFunction);
  return { status, next };
}

test('reservas: autoriza ADMIN e FUNCIONARIO ATENDENTE com tenant válido', () => {
  assert.deepEqual(authorize({role:UserRole.ADMIN, restaurantId:7}), {status:200,next:true});
  assert.deepEqual(authorize({role:UserRole.FUNCIONARIO,subRole:FuncionarioSubRole.ATENDENTE,restaurantId:7}), {status:200,next:true});
});
test('reservas: nega garçom, cozinha, outros papéis e tenant ausente', () => {
  assert.equal(authorize(null).status,401);
  for (const user of [
    {role:UserRole.FUNCIONARIO, subRole:FuncionarioSubRole.GARCOM, restaurantId:7},
    {role:UserRole.FUNCIONARIO, subRole:FuncionarioSubRole.COZINHA, restaurantId:7},
    {role:UserRole.FUNCIONARIO, subRole:FuncionarioSubRole.ATENDENTE, restaurantId:null},
    {role:UserRole.ADMIN, restaurantId:null},
    {role:UserRole.SUPER_ADMIN,restaurantId:7},
    {role:UserRole.CLIENTE,restaurantId:7},
    {role:UserRole.MOTOQUEIRO,restaurantId:7},
  ]) assert.deepEqual(authorize(user),{status:403,next:false});
});
