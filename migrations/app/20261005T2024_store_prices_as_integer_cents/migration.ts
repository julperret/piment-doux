#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/02b65fcf1c3915bd734fc902536428c342a1ea3b940ac3957be7df0e64ce7e2a/contract';
import endContract from '../../snapshots/02b65fcf1c3915bd734fc902536428c342a1ea3b940ac3957be7df0e64ce7e2a/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/94d8cc9bbfbb583be2376caaff91e2155445a85b8122a6af1b1c5224cf0ca60f/contract';
import startContract from '../../snapshots/94d8cc9bbfbb583be2376caaff91e2155445a85b8122a6af1b1c5224cf0ca60f/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';
import postgres from '@prisma/orm-postgres/runtime';

// Used only to build queries: no database is opened here.
const { sql: db, contract } = postgres<End>({ contractJson: endContract });

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'invoices',
        column: col('total_amount_cents', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dataTransform(contract, 'backfill-invoices-total_amount_cents', {
        // SELECT id FROM invoices WHERE total_amount_cents IS NULL LIMIT 1;
        check: () =>
          db.public.invoices
            .select('id')
            .where((f, fns) => fns.eq(f.total_amount_cents, null))
            .limit(1),
        // UPDATE invoices SET total_amount_cents = (total_amount * 100)::int4 WHERE total_amount_cents IS NULL;
        run: () =>
          db.public.invoices
            .update((f, fns) => ({
              total_amount_cents: fns.raw`(total_amount * 100)::int4`.returns('pg/int4@1'),
            }))
            .where((f, fns) => fns.eq(f.total_amount_cents, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'invoices', column: 'total_amount_cents' }),
      this.addColumn({
        schema: 'public',
        table: 'order_lines',
        column: col('unit_price_cents', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dataTransform(contract, 'backfill-order_lines-unit_price_cents', {
        // SELECT order_id, product_id FROM order_lines WHERE unit_price_cents IS NULL LIMIT 1;
        check: () =>
          db.public.order_lines
            .select('order_id', 'product_id')
            .where((f, fns) => fns.eq(f.unit_price_cents, null))
            .limit(1),
        // UPDATE order_lines SET unit_price_cents = (unit_price * 100)::int4 WHERE unit_price_cents IS NULL;
        run: () =>
          db.public.order_lines
            .update((f, fns) => ({
              unit_price_cents: fns.raw`(unit_price * 100)::int4`.returns('pg/int4@1'),
            }))
            .where((f, fns) => fns.eq(f.unit_price_cents, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'order_lines', column: 'unit_price_cents' }),
      this.addColumn({
        schema: 'public',
        table: 'products',
        column: col('price_cents', 'int4', { codecRef: { codecId: 'pg/int4@1' } }),
      }),
      this.dataTransform(contract, 'backfill-products-price_cents', {
        // SELECT id FROM products WHERE price_cents IS NULL LIMIT 1;
        check: () =>
          db.public.products
            .select('id')
            .where((f, fns) => fns.eq(f.price_cents, null))
            .limit(1),
        // UPDATE products SET price_cents = (price * 100)::int4 WHERE price_cents IS NULL;
        run: () =>
          db.public.products
            .update((f, fns) => ({
              price_cents: fns.raw`(price * 100)::int4`.returns('pg/int4@1'),
            }))
            .where((f, fns) => fns.eq(f.price_cents, null)),
      }),
      this.setNotNull({ schema: 'public', table: 'products', column: 'price_cents' }),
      this.dataTransform(contract, 'typechange-order_lines-discount_percent', {
        // SELECT order_id, product_id FROM order_lines WHERE discount_percent <> ROUND(discount_percent) LIMIT 1;
        check: () =>
          db.public.order_lines
            .select('order_id', 'product_id')
            .where((f, fns) => fns.raw`${f.discount_percent} <> ROUND(${f.discount_percent})`.returns('pg/bool@1'))
            .limit(1),
        // UPDATE order_lines SET discount_percent = ROUND(discount_percent)::int4 WHERE discount_percent <> ROUND(discount_percent);
        run: () =>
          db.public.order_lines
            .update((f, fns) => ({
              discount_percent: fns.raw`ROUND(${f.discount_percent})::int4`.returns('pg/int4@1'),
            }))
            .where((f, fns) => fns.raw`${f.discount_percent} <> ROUND(${f.discount_percent})`.returns('pg/bool@1')),
      }),
      this.alterColumnType({
        schema: 'public',
        table: 'order_lines',
        column: 'discount_percent',
        options: {
          qualifiedTargetType: 'int4',
          formatTypeExpected: 'integer',
          rawTargetTypeForLabel: 'int4',
        },
      }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'invoices',
        constraint: 'invoices_total_amount_non_negative_b70a6922',
      }),
      this.dropColumn({ schema: 'public', table: 'invoices', column: 'total_amount' }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'order_lines',
        constraint: 'order_lines_unit_price_non_negative_3c1fb11f',
      }),
      this.dropColumn({ schema: 'public', table: 'order_lines', column: 'unit_price' }),
      this.dropCheckConstraint({
        schema: 'public',
        table: 'products',
        constraint: 'products_price_non_negative_faabb23d',
      }),
      this.dropColumn({ schema: 'public', table: 'products', column: 'price' }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'invoices',
        constraint: 'invoices_total_amount_cents_non_negative_0b539c40',
        expression: 'total_amount_cents >= 0',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'order_lines',
        constraint: 'order_lines_unit_price_cents_non_negative_3f57b02c',
        expression: 'unit_price_cents >= 0',
      }),
      this.addCheckConstraint({
        schema: 'public',
        table: 'products',
        constraint: 'products_price_cents_non_negative_e66f0bc2',
        expression: 'price_cents >= 0',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
