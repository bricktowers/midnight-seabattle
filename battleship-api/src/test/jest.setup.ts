import { type AllureJestApi } from 'allure-jest/dist/AllureJestApi';

// for allure annotations
declare global {
  const allure: AllureJestApi;
}
