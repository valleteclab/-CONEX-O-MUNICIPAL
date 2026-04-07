import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'ibge_cities' })
@Index(['code'], { unique: true })
@Index(['state', 'name'])
export class IbgeCity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  code: string;

  @Column({ type: 'char', length: 2 })
  state: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ name: 'normalized_name', type: 'varchar', length: 160 })
  normalizedName: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
