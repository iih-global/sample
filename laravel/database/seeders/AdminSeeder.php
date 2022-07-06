<?php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class AdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $admin = User::firstOrNew();
        $admin->name = 'demo';
       	$admin->email = 'demo@yopmail.com';
		$admin->password = bcrypt('demo@123');
		$admin->save();
    }
}
