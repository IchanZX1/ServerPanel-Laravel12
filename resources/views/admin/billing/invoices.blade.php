@extends('layouts.admin')

@section('title')
    Billing Invoices
@endsection

@section('content-header')
    <h1>Billing Invoices<small>Payment history and pending invoices.</small></h1>
    <ol class="breadcrumb">
        <li><a href="{{ route('admin.index') }}">Admin</a></li>
        <li><a href="{{ route('admin.billing.plans') }}">Billing Plans</a></li>
        <li class="active">Invoices</li>
    </ol>
@endsection

@section('content')
<div class="row">
    <div class="col-xs-12">
        <div class="box box-primary">
            <div class="box-header with-border">
                <h3 class="box-title">Invoice List</h3>
            </div>
            <div class="box-body table-responsive no-padding">
                <table class="table table-hover">
                    <tbody>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Sub</th>
                            <th>Order ID</th>
                            <th class="text-center">Amount</th>
                            <th class="text-center">Type</th>
                            <th class="text-center">Status</th>
                            <th>Paid At</th>
                            <th class="text-center">Link</th>
                        </tr>
                        @foreach ($invoices as $invoice)
                            <tr>
                                <td><code>{{ $invoice->id }}</code></td>
                                <td>{{ optional($invoice->user)->username ?? '#' . $invoice->user_id }}</td>
                                <td><code>{{ $invoice->subscription_id }}</code></td>
                                <td><code>{{ $invoice->order_id }}</code></td>
                                <td class="text-center"><code>Rp {{ number_format($invoice->amount_cents, 0, ',', '.') }}</code></td>
                                <td class="text-center">
                                    @if($invoice->type === 'renewal')
                                        <span class="label label-info">renewal</span>
                                    @else
                                        <span class="label label-primary">initial</span>
                                    @endif
                                </td>
                                <td class="text-center">
                                    @if($invoice->status === 'paid')
                                        <span class="label label-success">Paid</span>
                                    @elseif($invoice->status === 'pending')
                                        <span class="label label-warning">Pending</span>
                                    @elseif($invoice->status === 'expired')
                                        <span class="label label-danger">Expired</span>
                                    @elseif($invoice->status === 'failed')
                                        <span class="label label-danger">Failed</span>
                                    @else
                                        <span class="label label-default">Cancelled</span>
                                    @endif
                                </td>
                                <td>{{ $invoice->paid_at ?? '—' }}</td>
                                <td class="text-center">
                                    <a href="{{ $invoice->redirect_url }}" target="_blank" rel="noreferrer" class="btn btn-xs btn-default">Pay</a>
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
            </div>
            <div class="box-footer clearfix">
                {{ $invoices->links('vendor.pagination.default') }}
            </div>
        </div>
    </div>
</div>
@endsection
