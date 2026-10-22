@auth <a href="/dashboard">Dashboard</a> @endauth
@guest <a href="/login">Log in</a> @endguest
@can('view-reports') <a href="/admin/reports">Reports</a> @endcan
