import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Injectable} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {type Observable} from 'rxjs';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {ApiService} from './api.service';
import {provideApiBaseUrl} from './api-base-url.token';

interface Account {
  id: string;
}

@Injectable()
class AccountsApiService extends ApiService {
  constructor() {
    super('accounts');
  }

  public list(params?: object): Observable<Account[]> {
    return this.get<Account[]>('', params);
  }

  public detail(id: string): Observable<Account> {
    return this.get<Account>(id);
  }

  public create(body: unknown): Observable<Account> {
    return this.post<Account>('', body);
  }

  public replace(id: string, body: unknown): Observable<Account> {
    return this.put<Account>(id, body);
  }

  public amend(id: string, body: unknown): Observable<Account> {
    return this.patch<Account>(id, body);
  }

  public remove(id: string, params?: object): Observable<void> {
    return this.delete<void>(id, params);
  }
}

@Injectable()
class RootApiService extends ApiService {
  constructor() {
    super('');
  }

  public ping(): Observable<unknown> {
    return this.get('health');
  }

  public root(): Observable<unknown> {
    return this.get();
  }
}

describe('ApiService', () => {
  let api: AccountsApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiBaseUrl('/api'),
        AccountsApiService,
        RootApiService,
      ],
    });
    api = TestBed.inject(AccountsApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
  });

  it('builds a collection URL from the base url and the subpath', () => {
    api.list().subscribe();
    http.expectOne(r => r.url === '/api/accounts' && r.method === 'GET').flush([]);
  });

  it('appends a resource path to the collection URL', () => {
    api.detail('acc-1').subscribe();
    http.expectOne('/api/accounts/acc-1').flush({id: 'acc-1'});
  });

  it('omits the subpath segment when the service has no subpath', () => {
    const root = TestBed.inject(RootApiService);
    root.ping().subscribe();
    http.expectOne('/api/health').flush({});

    root.root().subscribe();
    http.expectOne('/api').flush({});
  });

  it('sends a body on post, put and patch', () => {
    api.create({name: 'A'}).subscribe();
    const post = http.expectOne(r => r.method === 'POST');
    expect(post.request.body).toEqual({name: 'A'});
    post.flush({id: 'acc-1'});

    api.replace('acc-1', {name: 'B'}).subscribe();
    const put = http.expectOne(r => r.method === 'PUT');
    expect(put.request.url).toBe('/api/accounts/acc-1');
    expect(put.request.body).toEqual({name: 'B'});
    put.flush({id: 'acc-1'});

    api.amend('acc-1', {name: 'C'}).subscribe();
    const patch = http.expectOne(r => r.method === 'PATCH');
    expect(patch.request.body).toEqual({name: 'C'});
    patch.flush({id: 'acc-1'});
  });

  it('issues a DELETE against the resource URL', () => {
    api.remove('acc-1').subscribe();
    http.expectOne(r => r.method === 'DELETE' && r.url === '/api/accounts/acc-1').flush(null);
  });

  it('serialises string, number and boolean query params', () => {
    api.list({q: 'food', limit: 25, includeArchived: false}).subscribe();
    const req = http.expectOne(r => r.url === '/api/accounts');
    expect(req.request.params.get('q')).toBe('food');
    expect(req.request.params.get('limit')).toBe('25');
    expect(req.request.params.get('includeArchived')).toBe('false');
    req.flush([]);
  });

  it('drops null, undefined and empty-string params instead of sending them blank', () => {
    api.list({q: '', cursor: null, after: undefined, limit: 0}).subscribe();
    const req = http.expectOne(r => r.url === '/api/accounts');
    expect(req.request.params.has('q')).toBe(false);
    expect(req.request.params.has('cursor')).toBe(false);
    expect(req.request.params.has('after')).toBe(false);
    expect(req.request.params.get('limit')).toBe('0');
    req.flush([]);
  });

  it('drops params whose value is not a primitive', () => {
    api.list({range: {from: 1, to: 2}, tags: ['a', 'b']}).subscribe();
    const req = http.expectOne(r => r.url === '/api/accounts');
    expect(req.request.params.has('range')).toBe(false);
    expect(req.request.params.has('tags')).toBe(false);
    req.flush([]);
  });

  it('sends no params at all when none are supplied', () => {
    api.list().subscribe();
    const req = http.expectOne(r => r.url === '/api/accounts');
    expect(req.request.params.keys()).toHaveLength(0);
    req.flush([]);
  });

  it('supports params on a delete', () => {
    api.remove('acc-1', {purge: true}).subscribe();
    const req = http.expectOne(r => r.method === 'DELETE');
    expect(req.request.params.get('purge')).toBe('true');
    req.flush(null);
  });
});
