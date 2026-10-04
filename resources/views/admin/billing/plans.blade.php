@extends('layouts.admin')

@section('title')
    Billing Plans
@endsection

@section('content-header')
    <h1>Billing Plans<small>Server packages sold through the billing store.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li class="active">Billing Plans</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Plan List</h3>
                <div class="box-tools">
                    <button class="btn btn-sm btn-primary" data-toggle="modal" data-target="#newPlanModal">Create New</button>
                </div>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Egg</th>
                            <th>Node</th>
                            <th class="text-center">Memory</th>
                            <th class="text-center">CPU</th>
                            <th class="text-center">Disk</th>
                            <th class="text-center">Price</th>
                            <th class="text-center">Duration</th>
                            <th class="text-center">Status</th>
                        </tr>
                        @foreach ($plans as $plan)
                            <tr>
                                <td><code>{{ $plan->id }}</code></td>
                                <td><a href="#" data-toggle="modal" data-target="#editPlanModal{{ $plan->id }}">{{ $plan->name }}</a></td>
                                <td>{{ optional($plan->egg)->name ?? '—' }}</td>
                                <td>
                                    @if($plan->node)
                                        <a href="{{ route('admin.nodes.view', $plan->node->id) }}">{{ $plan->node->name }}</a>
                                    @else
                                        <span class="label label-default">Auto-deploy</span>
                                    @endif
                                </td>
                                <td class="text-center">{{ $plan->memory }} MB</td>
                                <td class="text-center">{{ $plan->cpu }}%</td>
                                <td class="text-center">{{ $plan->disk }} MB</td>
                                <td class="text-center"><code>Rp {{ number_format($plan->price_cents, 0, ',', '.') }}</code></td>
                                <td class="text-center">{{ $plan->duration_days }} days</td>
                                <td class="text-center">
                                    @if($plan->is_active)
                                        <span class="label label-success">Active</span>
                                    @else
                                        <span class="label label-danger">Inactive</span>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</div>

{{-- Create modal --}}
<div class="modal fade" id="newPlanModal" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <form action="{{ route('admin.billing.plans') }}" method="POST">
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Create Plan</h4>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Name</label>
                            <input type="text" name="name" class="form-control" required />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Egg</label>
                            <select name="egg_id" class="form-control" required>
                                @foreach ($eggs as $egg)
                                    <option value="{{ $egg->id }}">{{ $egg->name }}</option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Node (empty = auto-deploy)</label>
                            <select name="node_id" class="form-control">
                                <option value="">Auto-deploy</option>
                                @foreach ($nodes as $node)
                                    <option value="{{ $node->id }}">{{ $node->name }}</option>
                                @endforeach
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Description</label>
                            <input type="text" name="description" class="form-control" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-3">
                            <label class="form-label">Memory (MB)</label>
                            <input type="number" name="memory" class="form-control" value="1024" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Swap (MB)</label>
                            <input type="number" name="swap" class="form-control" value="0" />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Disk (MB)</label>
                            <input type="number" name="disk" class="form-control" value="5120" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">IO</label>
                            <input type="number" name="io" class="form-control" value="500" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4">
                            <label class="form-label">CPU (%)</label>
                            <input type="number" name="cpu" class="form-control" value="100" required />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Threads</label>
                            <input type="text" name="threads" class="form-control" placeholder="e.g. 2" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Docker Image</label>
                            <input type="text" name="docker_image" class="form-control" required />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4">
                            <label class="form-label">Databases</label>
                            <input type="number" name="database_limit" class="form-control" value="0" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Allocations</label>
                            <input type="number" name="allocation_limit" class="form-control" value="0" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Backups</label>
                            <input type="number" name="backup_limit" class="form-control" value="0" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Price (IDR, no decimals)</label>
                            <input type="number" name="price_cents" class="form-control" value="10000" required />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Duration (days)</label>
                            <input type="number" name="duration_days" class="form-control" value="30" required />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12">
                            <label class="form-label">Startup Command</label>
                            <textarea name="startup" class="form-control" rows="3" required></textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    {!! csrf_field() !!}
                    <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">Cancel</button>
                    <button type="submit" class="btn btn-success btn-sm">Create</button>
                </div>
            </form>
        </div>
    </div>
</div>

{{-- Edit modals --}}
@foreach ($plans as $plan)
<div class="modal fade" id="editPlanModal{{ $plan->id }}" tabindex="-1" role="dialog">
    <div class="modal-dialog" role="document">
        <div class="modal-content">
            <form action="{{ route('admin.billing.plans') }}/{{ $plan->id }}" method="POST">
                @method('PATCH')
                <div class="modal-header">
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                    <h4 class="modal-title">Edit Plan #{{ $plan->id }}</h4>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Name</label>
                            <input type="text" name="name" class="form-control" value="{{ $plan->name }}" required />
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Egg</label>
                            <select name="egg_id" class="form-control" required>
                                @foreach ($eggs as $egg)
                                    <option value="{{ $egg->id }}" {{ $egg->id === $plan->egg_id ? 'selected' : '' }}>{{ $egg->name }}</option>
                                @endforeach
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-6">
                            <label class="form-label">Node (empty = auto-deploy)</label>
                            <select name="node_id" class="form-control">
                                <option value="">Auto-deploy</option>
                                @foreach ($nodes as $node)
                                    <option value="{{ $node->id }}" {{ $node->id === $plan->node_id ? 'selected' : '' }}>{{ $node->name }}</option>
                                @endforeach
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">Description</label>
                            <input type="text" name="description" class="form-control" value="{{ $plan->description }}" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-3">
                            <label class="form-label">Memory (MB)</label>
                            <input type="number" name="memory" class="form-control" value="{{ $plan->memory }}" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Swap (MB)</label>
                            <input type="number" name="swap" class="form-control" value="{{ $plan->swap }}" />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">Disk (MB)</label>
                            <input type="number" name="disk" class="form-control" value="{{ $plan->disk }}" required />
                        </div>
                        <div class="col-md-3">
                            <label class="form-label">IO</label>
                            <input type="number" name="io" class="form-control" value="{{ $plan->io }}" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4">
                            <label class="form-label">CPU (%)</label>
                            <input type="number" name="cpu" class="form-control" value="{{ $plan->cpu }}" required />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Threads</label>
                            <input type="text" name="threads" class="form-control" value="{{ $plan->threads }}" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Docker Image</label>
                            <input type="text" name="docker_image" class="form-control" value="{{ $plan->docker_image }}" required />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4">
                            <label class="form-label">Databases</label>
                            <input type="number" name="database_limit" class="form-control" value="{{ $plan->database_limit }}" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Allocations</label>
                            <input type="number" name="allocation_limit" class="form-control" value="{{ $plan->allocation_limit }}" />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Backups</label>
                            <input type="number" name="backup_limit" class="form-control" value="{{ $plan->backup_limit }}" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-4">
                            <label class="form-label">Price (IDR, no decimals)</label>
                            <input type="number" name="price_cents" class="form-control" value="{{ $plan->price_cents }}" required />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Duration (days)</label>
                            <input type="number" name="duration_days" class="form-control" value="{{ $plan->duration_days }}" required />
                        </div>
                        <div class="col-md-4">
                            <label class="form-label">Active</label>
                            <select name="is_active" class="form-control">
                                <option value="1" {{ $plan->is_active ? 'selected' : '' }}>Active</option>
                                <option value="0" {{ !$plan->is_active ? 'selected' : '' }}>Inactive</option>
                            </select>
                        </div>
                    </div>
                    <div class="row">
                        <div class="col-md-12">
                            <label class="form-label">Startup Command</label>
                            <textarea name="startup" class="form-control" rows="3" required>{{ $plan->startup }}</textarea>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    {!! csrf_field() !!}
                    <button type="button" class="btn btn-default btn-sm pull-left" data-dismiss="modal">Cancel</button>
                    <button type="submit" name="action" value="delete" class="btn btn-danger btn-sm">Delete</button>
                    <button type="submit" class="btn btn-success btn-sm">Save</button>
                </div>
            </form>
        </div>
    </div>
</div>
@endforeach
@endsection
