@extends('layouts.admin')

@section('title')
    Billing Subscriptions
@endsection

@section('content-header')
    <h1>Billing Subscriptions<small>Active and historical server rentals.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.billing.plans') }}">Billing Plans</a></li>
        <li class="active">Subscriptions</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Subscription List</h3>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Plan</th>
                            <th>Server</th>
                            <th class="text-center">Status</th>
                            <th>Expires At</th>
                            <th>Created</th>
                            <th class="text-center">Actions</th>
                        </tr>
                        @foreach ($subscriptions as $subscription)
                            <tr>
                                <td><code>{{ $subscription->id }}</code></td>
                                <td><a href="{{ route('admin.users.view', $subscription->user_id) }}">{{ optional($subscription->user)->username ?? '#' . $subscription->user_id }}</a></td>
                                <td>{{ optional($subscription->plan)->name ?? 'deleted' }}</td>
                                <td>
                                    @if($subscription->server_id)
                                        <a href="{{ route('admin.servers.view', $subscription->server_id) }}">{{ optional($subscription->server)->name ?? '#' . $subscription->server_id }}</a>
                                        @if(optional($subscription->server)->status === 'suspended')
                                            <span class="label label-warning">server suspended</span>
                                        @endif
                                    @else
                                        <span class="label label-default">none</span>
                                    @endif
                                </td>
                                <td class="text-center">
                                    @if($subscription->status === 'active')
                                        <span class="label label-success">Active</span>
                                    @elseif($subscription->status === 'suspended')
                                        <span class="label label-warning">Suspended</span>
                                    @elseif($subscription->status === 'pending_payment')
                                        <span class="label label-info">Pending Payment</span>
                                    @elseif($subscription->status === 'expired')
                                        <span class="label label-danger">Expired</span>
                                    @else
                                        <span class="label label-default">Cancelled</span>
                                    @endif
                                </td>
                                <td>{{ $subscription->expires_at ?? '—' }}</td>
                                <td>{{ $subscription->created_at }}</td>
                                <td class="text-center">
                                    @if(is_null($subscription->server_id) && $subscription->status === 'active')
                                        <form action="{{ route('admin.billing.subscriptions.retry', $subscription->id) }}" method="POST" style="display:inline">
                                            {!! csrf_field() !!}
                                            <button type="submit" class="btn btn-xs btn-warning">Retry Provision</button>
                                        </form>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            <div class="box-footer clearfix">
                {{ $subscriptions->links('vendor.pagination.default') }}
            </div>
        </div>
    </div>
</div>
@endsection
